import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import {
  FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle,
  FaEye, FaTrash, FaUpload, FaTimes, FaFileUpload
} from 'react-icons/fa'

const EmployeeDashboard = () => {
  const { user, userProfile } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    // eslint-disable-next-line
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
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        e.target.value = ''
        return
      }
      setNewDocument(prev => ({ ...prev, file }))
    }
  }

  // Upload handler (WITHOUT session/token refresh logic)
  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (
      !newDocument.file ||
      !newDocument.title.trim() ||
      !newDocument.category ||
      !newDocument.department
    ) {
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
      const fileExt = newDocument.file.name.split('.').pop()
      const fileName = `user-uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload file to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, newDocument.file)
      if (uploadError) {
        setError('File upload failed: ' + uploadError.message)
        return
      }

      // Insert metadata to DB
      const insertData = {
        filename: newDocument.file.name,
        file_path: fileName,
        file_size: newDocument.file.size,
        file_type: newDocument.file.type,
        title: newDocument.title.trim(),
        category: newDocument.category,
        department: newDocument.department,
        description: newDocument.description?.trim() || null,
        document_type: 'general',
        upload_department: userProfile?.department,
        uploaded_by: user.id,
        status: 'pending'
      }
      const { error: dbError } = await supabase.from('documents').insert(insertData)
      if (dbError) {
        setError('Database error: ' + dbError.message)
        return
      }

      // Success - clean up
      setNewDocument({
        title: '',
        description: '',
        category: '',
        department: '',
        file: null
      })
      setUploadModal(false)
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      await fetchDocuments()
      setSuccess('Document uploaded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Error uploading document: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setUploading(false)
    }
  }

  const viewDocument = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600)
      if (error) {
        alert('Error accessing document: ' + error.message)
        return
      }
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank')
      } else {
        alert('Unable to generate access URL for this document')
      }
    } catch (error) {
      alert('Error accessing document: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const handleDeleteDocument = async (doc) => {
    const documentName = doc.title || doc.filename || 'this document'
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return
    }
    try {
      setDeleting(true)
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .eq('uploaded_by', user.id)
      if (dbError) {
        throw new Error(`Failed to delete document: ${dbError.message}`)
      }
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path])
        if (storageError) {
          console.warn('Storage deletion warning:', storageError)
        }
      }
      await fetchDocuments()
      setSuccess('Document deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Error deleting document: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setDeleting(false)
    }
  }

  const closeUploadModal = () => {
    setUploadModal(false)
    setNewDocument({ title: '', description: '', category: '', department: '', file: null })
    setError('')
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Documents</h1>
              <p className="text-gray-600">Upload and manage your personal documents</p>
            </div>
            <button
              type="button"
              onClick={() => setUploadModal(true)}
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
                        <div className="text-sm font-medium text-gray-900">{doc.title}</div>
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
      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Upload Document</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <FaTimes size={24} />
              </button>
            </div>
            <form onSubmit={handleFileUpload}>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={newDocument.title}
                onChange={e => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                required
                className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter document title"
              />
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={newDocument.category}
                onChange={e => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                required
                className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select category</option>
                {["Medical", "Contract", "Training", "Safety", "HR", "Insurance", "Background Check", "Other"].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                name="department"
                value={newDocument.department}
                onChange={e => setNewDocument(prev => ({ ...prev, department: e.target.value }))}
                required
                className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select department</option>
                {["systems", "human_resources", "finance_accounts", "legal", "administration", "mining_operations", "marketing_sales", "medical", "security"].map(dep => (
                  <option key={dep} value={dep}>{dep.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={newDocument.description}
                onChange={e => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                Document file <span className="text-red-500">*</span>
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                required
                onChange={handleFileChange}
                className="mb-4 block w-full cursor-pointer rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mb-4">Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG. Max size 10MB.</p>
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
  )
}

export default EmployeeDashboard
