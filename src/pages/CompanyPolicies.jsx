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
  FaFileUpload
} from 'react-icons/fa'

const CompanyPolicies = () => {
  const { user, userProfile } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid file type (PDF, DOCX, TXT, PNG, JPG)')
        return
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
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

    try {
      setUploading(true)

      // Upload file to Supabase Storage
      const fileExt = uploadForm.file.name.split('.').pop()
      const fileName = `policies/${Date.now()}-${uploadForm.file.name}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadForm.file)

      if (uploadError) throw uploadError

      // Save policy metadata to database
      const { error: dbError } = await supabase
        .from('company_policies')
        .insert({
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          file_url: fileName,
          file_name: uploadForm.file.name,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          uploaded_by: user.id
        })

      if (dbError) throw dbError

      // Reset form and close modal
      setUploadForm({ title: '', description: '', category: 'compliance', file: null })
      setShowUploadModal(false)
      
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

  const viewPolicy = async (policy) => {
    try {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(policy.file_url)

      if (data.publicUrl) {
        window.open(data.publicUrl, '_blank')
      }
    } catch (error) {
      console.error('Error viewing policy:', error)
    }
  }

  const downloadPolicy = async (policy) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(policy.file_url)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = policy.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading policy:', error)
      alert('Error downloading policy: ' + error.message)
    }
  }

  const deletePolicy = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return

    try {
      const { error } = await supabase
        .from('company_policies')
        .delete()
        .eq('id', policyId)

      if (error) throw error

      await fetchPolicies()
      alert('Policy deleted successfully!')
    } catch (error) {
      console.error('Error deleting policy:', error)
      alert('Error deleting policy: ' + error.message)
    }
  }

  const filteredPolicies = policies.filter(policy => 
    categoryFilter === 'all' || policy.category === categoryFilter
  )

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
      <div className="bg-white/60 backdrop-blur rounded-xl shadow-lg p-6 mb-8">
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
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
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
          <div key={policy.id} className="bg-white/60 backdrop-blur rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Manrope' }}>
                  {policy.title}
                </h3>
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                  {policy.category.charAt(0).toUpperCase() + policy.category.slice(1)}
                </span>
              </div>
              <FaFileAlt className="h-8 w-8 text-primary-500" />
            </div>

            <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'Work Sans' }}>
              {policy.description || 'No description available'}
            </p>

            <div className="text-xs text-gray-500 mb-4">
              Uploaded {new Date(policy.created_at).toLocaleDateString()}
              {policy.uploader && (
                <span> by {policy.uploader.first_name} {policy.uploader.last_name}</span>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => viewPolicy(policy)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1"
              >
                <FaEye className="h-3 w-3" />
                <span>View</span>
              </button>
              <button
                onClick={() => downloadPolicy(policy)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1"
              >
                <FaDownload className="h-3 w-3" />
                <span>Download</span>
              </button>
              {userProfile?.role === 'hr' && (
                <button
                  onClick={() => deletePolicy(policy.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Delete
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
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Company Policy</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      required
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Accepted formats: PDF, DOCX, TXT, PNG, JPG (Max 10MB)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
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
