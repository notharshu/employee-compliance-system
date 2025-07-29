import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { FaFileAlt, FaUpload, FaEye, FaDownload, FaFilter, FaTimes, FaFileUpload, FaTrash } from 'react-icons/fa'

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

  // Check if user can upload policies (General Manager or Manager)
  const canUploadPolicies = userProfile?.designation === 'general_manager' || 
                           userProfile?.designation === 'manager'

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
            email,
            designation,
            department
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

    // Updated permission check for General Managers and Managers
    if (!canUploadPolicies) {
      alert('Only General Managers and Managers can upload company policies')
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
      setUploadForm({
        title: '',
        description: '',
        category: 'compliance',
        file: null
      })
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
      // Different access durations based on user designation and policy category
      let expirySeconds = 3600; // Default: 1 hour
      
      if (userProfile?.designation === 'general_manager' || userProfile?.designation === 'manager') {
        expirySeconds = 7200; // GM/Manager gets 2 hours
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
        const accessDuration = (userProfile?.designation === 'general_manager' || userProfile?.designation === 'manager') 
          ? '2 hours' 
          : (policy.category === 'compliance' || policy.category === 'legal') 
            ? '30 minutes' 
            : '1 hour'

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
    // Only allow General Managers and Managers to delete policies
    if (!canUploadPolicies) {
      alert('Only General Managers and Managers can delete company policies')
      return
    }

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
    setUploadForm({
      title: '',
      description: '',
      category: 'compliance',
      file: null
    })
    // Clear file input
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading policies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Company Policies
              </h1>
              <p className="text-gray-600">
                Access and manage company-wide policy documents
              </p>
            </div>
            
            {/* Upload button - only show to General Managers and Managers */}
            {canUploadPolicies && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaUpload className="mr-2" />
                Upload Policy
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaFileAlt className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Policies</p>
                <p className="text-2xl font-bold text-gray-900">{policies.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaFilter className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaEye className="text-purple-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {categoryFilter === 'all' ? 'All Policies' : 'Filtered'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{filteredPolicies.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  categoryFilter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolicies.map((policy) => (
            <div key={policy.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {policy.title}
                    </h3>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                      {policy.category}
                    </span>
                  </div>
                  
                  {/* Delete button - only show to General Managers and Managers */}
                  {canUploadPolicies && (
                    <button
                      onClick={() => deletePolicy(policy.id, policy.title)}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 ml-2"
                      title="Delete Policy"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {policy.description || 'No description available'}
                </p>

                <div className="text-xs text-gray-500 mb-4">
                  <p>
                    Uploaded by: {policy.uploader?.first_name && policy.uploader?.last_name
                      ? `${policy.uploader.first_name} ${policy.uploader.last_name}`
                      : 'Unknown User'
                    }
                  </p>
                  <p>
                    Department: {policy.uploader?.department || 'Not specified'}
                  </p>
                  <p>
                    Date: {new Date(policy.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => viewPolicy(policy)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <FaEye className="mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => downloadPolicy(policy)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <FaDownload className="mr-1" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPolicies.length === 0 && (
          <div className="text-center py-12">
            <FaFileAlt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No policies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {categoryFilter !== 'all'
                ? 'Try selecting a different category.'
                : 'No policies have been uploaded yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Upload Policy Document
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter policy title"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category} className="capitalize">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter policy description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Document *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOCX, DOC, TXT, PNG, JPG (Max: 10MB)
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaFileUpload className="mr-2" />
                      Upload Policy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyPolicies
