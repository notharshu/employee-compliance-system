import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { 
  FaFileAlt, FaUpload, FaTimes, FaEye, FaTrash, FaFilter, FaFileUpload 
} from 'react-icons/fa'

const CompanyPolicies = () => {
  const { user, userProfile } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newPolicy, setNewPolicy] = useState({
    title: '',
    description: '',
    category: '',
    file: null
  })

  // Define categories
  const categories = [
    'hr', 'safety', 'compliance', 'operations', 'finance', 'legal', 'general'
  ]

  // Check if user can upload policies (General Manager only)
  const canUploadPolicies = userProfile?.designation === 'general_manager'

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('company_policies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPolicies(data || [])
    } catch (error) {
      console.error('Error fetching policies:', error)
      setError('Error loading policies: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]

      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PDF or Word document')
        e.target.value = ''
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        e.target.value = ''
        return
      }

      setNewPolicy(prev => ({ ...prev, file }))
    }
  }

  const handleUploadPolicy = async (e) => {
    e.preventDefault()

    if (!newPolicy.file || !newPolicy.title.trim() || !newPolicy.category) {
      setError('Please fill in all required fields')
      return
    }

    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    try {
      setUploading(true)
      setError('')

      // Upload file to Storage
      const fileExt = newPolicy.file.name.split('.').pop()
      const fileName = `policies/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('company_policies')
        .upload(fileName, newPolicy.file)

      if (uploadError) {
        setError('File upload failed: ' + uploadError.message)
        return
      }

      // Insert to database
      const insertData = {
        title: newPolicy.title.trim(),
        description: newPolicy.description.trim() || null,
        category: newPolicy.category,
        file_path: fileName,
        filename: newPolicy.file.name,
        file_size: newPolicy.file.size,
        file_type: newPolicy.file.type,
        uploaded_by: user.id,
        status: 'active'
      }

      const { error: dbError } = await supabase
        .from('policies')
        .insert(insertData)

      if (dbError) {
        setError('Database error: ' + dbError.message)
        return
      }

      // Success - clean up
      setNewPolicy({
        title: '',
        description: '',
        category: '',
        file: null
      })
      setShowUploadModal(false)

      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''

      await fetchPolicies()
      setSuccess('Policy uploaded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Error uploading policy: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setUploading(false)
    }
  }

  const handleViewPolicy = async (policy) => {
    try {
      const { data, error } = await supabase.storage
        .from('policies')
        .createSignedUrl(policy.file_path, 300, { download: false })

      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Error viewing policy:', error)
      alert('Error viewing policy. Please try again.')
    }
  }

  const handleDeletePolicy = async (policy) => {
    if (!window.confirm(`Are you sure you want to delete "${policy.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      // Delete from database first
      const { error: dbError } = await supabase
        .from('company_policies')
        .delete()
        .eq('id', policy.id)

      if (dbError) {
        throw new Error(`Failed to delete policy: ${dbError.message}`)
      }

      // Delete from storage
      if (policy.file_path) {
        const { error: storageError } = await supabase.storage
          .from('policies')
          .remove([policy.file_path])

        if (storageError) {
          console.warn('Storage deletion warning:', storageError)
        }
      }

      await fetchPolicies()
      setSuccess('Policy deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Error deleting policy: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setDeleting(false)
    }
  }

  const closeUploadModal = () => {
    setShowUploadModal(false)
    setNewPolicy({
      title: '',
      description: '',
      category: '',
      file: null
    })
    setError('')
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  // Filter policies based on selected category
  const filteredPolicies = policies.filter(policy =>
    categoryFilter === 'all' || policy.category === categoryFilter
  )

  // Get count of policies per category
  const getCategoryCount = (category) => {
    if (category === 'all') {
      return policies.length
    }
    return policies.filter(policy => policy.category === category).length
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Policies</h1>
              <p className="text-gray-600">Access and manage company-wide policy documents</p>
            </div>
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

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Category Filter with Counts */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories ({getCategoryCount('all')})
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  categoryFilter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)} ({getCategoryCount(category)})
              </button>
            ))}
          </div>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolicies.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm">
              <FaFileAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No policies found</h3>
              <p className="text-gray-500">
                {categoryFilter === 'all' 
                  ? 'No policies have been uploaded yet.'
                  : `No policies found in the "${categoryFilter}" category.`
                }
              </p>
              {canUploadPolicies && categoryFilter === 'all' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaUpload className="mr-2" />
                  Upload First Policy
                </button>
              )}
            </div>
          ) : (
            filteredPolicies.map((policy) => (
              <div key={policy.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{policy.title}</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {policy.category.charAt(0).toUpperCase() + policy.category.slice(1)}
                    </span>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleViewPolicy(policy)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="View Policy"
                    >
                      <FaEye />
                    </button>
                    {canUploadPolicies && (
                      <button
                        onClick={() => handleDeletePolicy(policy)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                        title="Delete Policy"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
                
                {policy.description && (
                  <p className="text-gray-600 text-sm mb-3">{policy.description}</p>
                )}
                
                <div className="text-xs text-gray-500">
                  <p>Uploaded: {new Date(policy.created_at).toLocaleDateString()}</p>
                  <p>File: {policy.filename}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Upload Policy</h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeUploadModal}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleUploadPolicy}>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={newPolicy.title}
                  onChange={e => setNewPolicy(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter policy title"
                />

                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={newPolicy.category}
                  onChange={e => setNewPolicy(prev => ({ ...prev, category: e.target.value }))}
                  required
                  className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>

                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={newPolicy.description}
                  onChange={e => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                  className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description"
                />

                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                  Policy file <span className="text-red-500">*</span>
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  required
                  onChange={handleFileChange}
                  className="mb-4 block w-full cursor-pointer rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mb-4">
                  Supported formats: PDF, DOC, DOCX. Max size 10MB.
                </p>

                {error && (
                  <p className="mb-4 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className={`inline-flex items-center rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploading && (
                      <svg className="mr-2 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h-4z" />
                      </svg>
                    )}
                    <FaFileUpload className="mr-1" />
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanyPolicies
