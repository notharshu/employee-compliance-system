import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, DOCUMENT_CATEGORIES, DOCUMENT_STATUS } from '../utils/supabase'
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle, FaEye, FaTrash, FaUpload, FaTimes, FaFileUpload } from 'react-icons/fa'

const EmployeeDashboard = () => {
  const { user, userProfile, isSessionValid, refreshSession } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Updated state to match your database schema
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: '',
    department: '',
    file: null
  })

  useEffect(() => {
    if (user?.id) {
      fetchDocuments()
    }
  }, [user])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
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
        e.target.value = ''
        return
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        e.target.value = ''
        return
      }

      setNewDocument(prev => ({ ...prev, file }))
    }
  }

  const handleFileUpload = async (e) => {
    console.log('=== UPLOAD FUNCTION STARTED ===')
    e.preventDefault()
    
    // Check if session is valid before making API calls
    if (!isSessionValid()) {
      console.log('Session invalid, attempting to refresh...')
      const { error: refreshError } = await refreshSession()
      
      if (refreshError) {
        setError('Session expired. Please login again.')
        return
      }
    }

    // Validate form fields
    if (!newDocument.file || !newDocument.title.trim() || !newDocument.category || !newDocument.department) {
      console.log('Validation failed:', newDocument)
      setError('Please fill in all required fields')
      return
    }

    if (!user?.id) {
      console.log('No user ID found')
      setError('User not authenticated')
      return
    }

    try {
      setUploading(true)
      setError('')
      console.log('Starting upload process...')

      // Upload file to Storage
      const fileExt = newDocument.file.name.split('.').pop()
      const fileName = `user-uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      console.log('Uploading to storage:', fileName)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, newDocument.file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw uploadError
      }

      console.log('File uploaded successfully')

      // Insert to database
      const insertData = {
        filename: newDocument.file.name,
        file_path: fileName,
        file_size: newDocument.file.size,
        file_type: newDocument.file.type,
        title: newDocument.title.trim(),
        category: newDocument.category,
        department: newDocument.department,
        description: newDocument.description.trim() || null,
        document_type: 'general',
        upload_department: userProfile?.department,
        uploaded_by: user.id,
        status: 'pending'
      }

      console.log('Inserting to database:', insertData)
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert(insertData)
        .select()

      if (dbError) {
        console.error('Database error:', dbError)
        throw dbError
      }

      console.log('Database insert successful')

      // Success - clean up
      setNewDocument({
        title: '',
        description: '',
        category: '',
        department: '',
        file: null
      })
      setUploadModal(false)

      // Clear file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''

      await fetchDocuments()
      setSuccess('Document uploaded successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      console.error('Upload error:', error)
      setError('Error uploading document: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setUploading(false)
    }
  }

  const viewDocument = async (doc) => {
    try {
      // Create signed URL for viewing (1 hour access)
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600)

      if (error) {
        console.error('Error creating signed URL:', error)
        alert('Error accessing document: ' + error.message)
        return
      }

      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank')
      } else {
        alert('Unable to generate access URL for this document')
      }
    } catch (error) {
      console.error('Error viewing document:', error)
      alert('Error accessing document: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const handleDeleteDocument = async (doc) => {
    const documentName = doc.title || doc.filename || 'this document'
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      // Delete from database first
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .eq('uploaded_by', user.id)

      if (dbError) {
        console.error('Database deletion error:', dbError)
        throw new Error(`Failed to delete document: ${dbError.message}`)
      }

      // Delete from storage if file exists
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path])

        if (storageError) {
          console.warn('Storage deletion warning:', storageError)
        }
      }

      // Refresh documents list
      await fetchDocuments()
      setSuccess('Document deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      console.error('Error deleting document:', error)
      setError('Error deleting document: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setDeleting(false)
    }
  }

  const closeUploadModal = () => {
    setUploadModal(false)
    setNewDocument({
      title: '',
      description: '',
      category: '',
      department: '',
      file: null
    })
    setError('')
    // Clear file input
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  if (loading && documents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your documents...</p>
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
                My Documents
              </h1>
              <p className="text-gray-600">
                Upload and manage your personal documents
              </p>
            </div>
            <button
              onClick={() => {
                console.log('Upload button clicked')
                setUploadModal(true)
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaUpload className="mr-2" />
              Upload Document
            </button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaFileAlt className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaClock className="text-yellow-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaTimesCircle className="text-red-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {doc.title}
                        </div>
                        <div className="text-sm text-gray-500">{doc.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        {doc.file_path && (
                          <button
                            onClick={() => viewDocument(doc)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Document"
                          >
                            <FaEye />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete Document"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {documents.length === 0 && (
            <div className="text-center py-12">
              <FaFileAlt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents uploaded yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading your first document.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FaUpload className="mr-2" />
                  Upload Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal - THIS WAS MISSING! */}
      {uploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upload Document</h3>
              <button
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFileUpload}>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={newDocument.title}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter document title"
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="category"
                    required
                    value={newDocument.category}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="Medical">Medical</option>
                    <option value="Contract">Contract</option>
                    <option value="Training">Training</option>
                    <option value="Safety">Safety</option>
                    <option value="HR">HR</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Background Check">Background Check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Department Dropdown */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    id="department"
                    required
                    value={newDocument.department}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    <option value="systems">Systems</option>
                    <option value="human_resources">Human Resources</option>
                    <option value="finance_accounts">Finance & Accounts</option>
                    <option value="legal">Legal</option>
                    <option value="administration">Administration</option>
                    <option value="mining_operations">Mining & Operations</option>
                    <option value="marketing_sales">Marketing & Sales</option>
                    <option value="medical">Medical</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter document description (optional)"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                    Document File *
                  </label>
                  <input
                    id="file"
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOCX, DOC, TXT, PNG, JPG (Max: 10MB)
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeUploadModal}
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
                      Upload Document
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

export default EmployeeDashboard
