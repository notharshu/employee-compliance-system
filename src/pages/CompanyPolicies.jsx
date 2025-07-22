import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { 
  FaFileAlt, 
  FaUpload, 
  FaEye, 
  FaDownload, 
  FaFilter,
  FaTimes,
  FaFileUpload,
  FaTrash
} from 'react-icons/fa'

const CompanyPolicies = () => {
  const { user, userProfile } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'compliance',
    file: null
  })

  const categories = [
    'compliance',
    'hr',
    'safety',
    'finance',
    'operations',
    'legal',
    'benefits',
    'training'
  ]

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('company_policies')
        .select(`
          *,
          uploader:profiles!uploaded_by (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched policies:', data)
      setPolicies(data || [])
    } catch (error) {
      console.error('Error fetching policies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain', 
        'image/png', 
        'image/jpeg',
        'image/jpg'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid file type (PDF, DOCX, DOC, TXT, PNG, JPG)')
        e.target.value = '' // Reset file input
        return
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        e.target.value = '' // Reset file input
        return
      }

      setUploadForm(prev => ({ ...prev, file }))
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (!uploadForm.file || !uploadForm.title.trim()) {
      alert('Please fill in all required fields')
      return
    }

    if (userProfile?.role !== 'hr') {
      alert('Only HR users can upload policies')
      return
    }

    try {
      setUploading(true)

      // Upload file to Supabase Storage
      const fileExt = uploadForm.file.name.split('.').pop()
      const fileName = `policies/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadForm.file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw uploadError
      }

      console.log('File uploaded to:', fileName)

      // Save policy metadata to database
      const { error: dbError } = await supabase
        .from('company_policies')
        .insert({
          title: uploadForm.title.trim(),
          description: uploadForm.description.trim(),
          category: uploadForm.category,
          file_url: fileName,
          file_name: uploadForm.file.name,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          uploaded_by: user.id
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        throw dbError
      }

      // Reset form and close modal
      setUploadForm({ title: '', description: '', category: 'compliance', file: null })
      setShowUploadModal(false)
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      
      // Refresh policies list
      await fetchPolicies()
      alert('Policy uploaded successfully!')

    } catch (error) {
      console.error('Error uploading policy:', error)
      alert('Error uploading policy: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // Updated viewPolicy function with timed access
  const viewPolicy = async (policy) => {
    try {
      // Different access durations based on user role and policy category
      let expirySeconds = 3600; // Default: 1 hour
      
      if (userProfile?.role === 'hr') {
        expirySeconds = 7200; // HR gets 2 hours
      } else if (policy.category === 'compliance' || policy.category === 'legal') {
        expirySeconds = 1800; // Sensitive docs: 30 minutes for employees
      }

      console.log('Creating signed URL for:', policy.file_url)

      // Create a signed URL with timed access
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(policy.file_url, expirySeconds)

      if (error) {
        console.error('Error creating signed URL:', error)
        alert('Error accessing policy document: ' + error.message)
        return
      }

      if (data.signedUrl) {
        console.log('Signed URL created successfully')
        
        // Show access expiry info to user
        const expiryTime = new Date(Date.now() + (expirySeconds * 1000)).toLocaleTimeString()
        const accessDuration = userProfile?.role === 'hr' ? '2 hours' : 
                              (policy.category === 'compliance' || policy.category === 'legal') ? '30 minutes' : '1 hour'
        
        // Optional: Show user when access expires
        const shouldContinue = window.confirm(
          `This document will be accessible for ${accessDuration} (until ${expiryTime}). Continue?`
        )
        
        if (shouldContinue) {
          window.open(data.signedUrl, '_blank')
        }
      } else {
        alert('Unable to generate access URL for this document')
      }
    } catch (error) {
      console.error('Error viewing policy:', error)
      alert('Error accessing policy: ' + error.message)
    }
  }

  // Updated downloadPolicy function with timed access
  const downloadPolicy = async (policy) => {
    try {
      console.log('Creating download URL for:', policy.file_url)

      // Create signed URL for download with 10 minutes expiry
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(policy.file_url, 600)

      if (error) {
        console.error('Error creating download URL:', error)
        alert('Error downloading policy: ' + error.message)
        return
      }

      if (data.signedUrl) {
        console.log('Download URL created successfully')
        
        // Create temporary anchor for download
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = policy.file_name || policy.title
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        // Optional: Show download expiry info
        alert('Download started! Link expires in 10 minutes.')
      } else {
        alert('Unable to generate download URL')
      }
    } catch (error) {
      console.error('Error downloading policy:', error)
      alert('Error downloading policy: ' + error.message)
    }
  }

  const deletePolicy = async (policyId, policyTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${policyTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('company_policies')
        .delete()
        .eq('id', policyId)

      if (error) {
        console.error('Error deleting policy:', error)
        throw error
      }

      await fetchPolicies()
      alert('Policy deleted successfully!')
    } catch (error) {
      console.error('Error deleting policy:', error)
      alert('Error deleting policy: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const filteredPolicies = policies.filter(policy => 
    categoryFilter === 'all' || policy.category === categoryFilter
  )

  const closeModal = () => {
    setShowUploadModal(false)
    setUploadForm({ title: '', description: '', category: 'compliance', file: null })
    
    // Clear file input
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope' }}>
          Company Policies
        </h1>
        <p className="text-gray-600" style={{ fontFamily: 'Work Sans' }}>
          Access and manage company-wide policy documents
        </p>
      </div>

      {/* Stats and Actions */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{policies.length}</p>
              <p className="text-sm text-gray-600">Total Policies</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {categories.length}
              </p>
              <p className="text-sm text-gray-600">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {filteredPolicies.length}
              </p>
              <p className="text-sm text-gray-600">
                {categoryFilter === 'all' ? 'All Policies' : 'Filtered'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            {/* Upload Button - HR Only */}
            {userProfile?.role === 'hr' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
              >
                <FaUpload className="h-4 w-4" />
                <span>Upload Policy</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolicies.map((policy) => (
          <div key={policy.id} className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-white/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Manrope' }}>
                  {policy.title}
                </h3>
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                  {policy.category.charAt(0).toUpperCase() + policy.category.slice(1)}
                </span>
              </div>
              <FaFileAlt className="h-8 w-8 text-primary-500 flex-shrink-0" />
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-3" style={{ fontFamily: 'Work Sans' }}>
              {policy.description || 'No description available'}
            </p>

            <div className="text-xs text-gray-500 mb-4">
              <div>Uploaded {new Date(policy.created_at).toLocaleDateString()}</div>
              {policy.uploader && (
                <div>by {policy.uploader.first_name} {policy.uploader.last_name}</div>
              )}
              <div className="mt-1">
                Size: {policy.file_size ? (policy.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => viewPolicy(policy)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors duration-200"
                title="View document (timed access)"
              >
                <FaEye className="h-3 w-3" />
                <span>View</span>
              </button>
              <button
                onClick={() => downloadPolicy(policy)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors duration-200"
                title="Download document (10 min access)"
              >
                <FaDownload className="h-3 w-3" />
                <span>Download</span>
              </button>
              {userProfile?.role === 'hr' && (
                <button
                  onClick={() => deletePolicy(policy.id, policy.title)}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
                  title="Delete policy"
                >
                  <FaTrash className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPolicies.length === 0 && (
        <div className="text-center py-12">
          <FaFileAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg mb-2">No policies found</p>
          <p className="text-gray-400">
            {categoryFilter !== 'all' 
              ? 'Try selecting a different category.'
              : 'No policies have been uploaded yet.'
            }
          </p>
        </div>
      )}

      {/* Upload Modal - HR Only */}
      {showUploadModal && userProfile?.role === 'hr' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Company Policy</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Employee Code of Conduct"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Brief description of the policy..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Document *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-500 transition-colors duration-200">
                    <input
                      type="file"
                      required
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                      className="w-full cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Accepted formats: PDF, DOCX, DOC, TXT, PNG, JPG (Max 10MB)
                    </p>
                    {uploadForm.file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2 transition-colors duration-200"
                  >
                    {uploading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <FaFileUpload className="h-4 w-4" />
                    )}
                    <span>{uploading ? 'Uploading...' : 'Upload Policy'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyPolicies
