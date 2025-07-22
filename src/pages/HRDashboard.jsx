import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle, FaDownload, FaEye, FaTrash, FaExternalLinkAlt } from 'react-icons/fa'

const HRDashboard = () => {
  const { user, userProfile } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [reviewModal, setReviewModal] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  useEffect(() => {
    if (user && userProfile?.role === 'hr') {
      fetchAllDocuments()
    }
  }, [user, userProfile])

  const fetchAllDocuments = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          employee_id,
          filename,
          file_path,
          file_url,
          category,
          department,
          description,
          status,
          expiry_date,
          uploaded_at,
          created_at,
          review_notes,
          reviewed_at,
          reviewed_by,
          employee:profiles!employee_id (
            id,
            first_name,
            last_name,
            email,
            designation,
            role
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
        throw error
      }

      console.log('Fetched documents:', data)
      
      setDocuments(data || [])
      
      const totalDocs = data?.length || 0
      const pendingDocs = data?.filter(doc => doc.status === 'pending').length || 0
      const approvedDocs = data?.filter(doc => doc.status === 'approved').length || 0
      const rejectedDocs = data?.filter(doc => doc.status === 'rejected').length || 0
      
      setStats({
        total: totalDocs,
        pending: pendingDocs,
        approved: approvedDocs,
        rejected: rejectedDocs
      })

    } catch (error) {
      console.error('Error fetching documents:', error)
      alert('Error loading documents: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewDocument = async (action) => {
    if (!selectedDocument) return

    try {
      setUpdating(true)
      
      const { error } = await supabase
        .from('documents')
        .update({
          status: action,
          review_notes: reviewNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', selectedDocument.id)

      if (error) {
        console.error('Error updating document:', error)
        throw error
      }

      setReviewModal(false)
      setSelectedDocument(null)
      setReviewNotes('')
      
      await fetchAllDocuments()
      
      alert(`Document ${action === 'approved' ? 'approved' : 'rejected'} successfully!`)
      
    } catch (error) {
      console.error('Error updating document:', error)
      alert('Error updating document status: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleQuickAction = async (documentId, action) => {
    try {
      setUpdating(true)
      
      const { error } = await supabase
        .from('documents')
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', documentId)

      if (error) {
        console.error('Error updating document:', error)
        throw error
      }

      await fetchAllDocuments()
      
      alert(`Document ${action === 'approved' ? 'approved' : 'rejected'} successfully!`)
      
    } catch (error) {
      console.error('Error updating document:', error)
      alert('Error updating document status: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteDocument = async (document) => {
    const documentName = document.filename || 'this document'
    
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path])
        
        if (storageError) {
          console.warn('Error deleting file from storage:', storageError)
        }
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)

      if (dbError) {
        console.error('Error deleting document from database:', dbError)
        throw dbError
      }

      await fetchAllDocuments()
      alert('Document deleted successfully!')

      if (reviewModal && selectedDocument?.id === document.id) {
        setReviewModal(false)
        setSelectedDocument(null)
        setReviewNotes('')
      }

    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const downloadDocument = async (document) => {
    if (!document.file_path) {
      alert('File not available for download')
      return
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (error) {
        console.error('Download error:', error)
        throw error
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = document.filename || 'document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error downloading document: ' + error.message)
    }
  }

  const viewDocument = async (document) => {
    if (!document.file_path) {
      alert('File not available for viewing')
      return
    }

    try {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(document.file_path)

      if (data.publicUrl) {
        window.open(data.publicUrl, '_blank')
      } else {
        alert('Unable to generate viewing URL for this document')
      }
      
    } catch (error) {
      console.error('Error viewing document:', error)
      alert('Error opening document: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredDocuments = documents.filter(doc => {
    if (filterStatus === 'all') return true
    return doc.status === filterStatus
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (userProfile?.role !== 'hr') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700">You don't have permission to access the HR Dashboard. This page is only available for HR personnel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Dashboard</h1>
        <p className="text-gray-600">Review and manage employee documents and compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <FaFileAlt className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <FaClock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Review</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <FaCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <FaTimesCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Rejected</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex space-x-1 mb-6">
          {[
            { key: 'all', label: 'All Documents', count: stats.total },
            { key: 'pending', label: 'Pending Review', count: stats.pending },
            { key: 'approved', label: 'Approved', count: stats.approved },
            { key: 'rejected', label: 'Rejected', count: stats.rejected }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterStatus === filter.key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
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
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.employee?.first_name && doc.employee?.last_name 
                          ? `${doc.employee.first_name} ${doc.employee.last_name}`
                          : 'Unknown User'
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        {doc.employee?.email || 'No email available'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {doc.employee?.designation || 'Employee'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.filename || 'Untitled Document'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {doc.description || 'No description'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {doc.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                      {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.uploaded_at 
                      ? new Date(doc.uploaded_at).toLocaleDateString()
                      : new Date(doc.created_at).toLocaleDateString()
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDocument(doc)
                          setReviewModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <FaEye className="h-4 w-4" />
                      </button>

                      {doc.file_path && (
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Download"
                        >
                          <FaDownload className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                        title="Delete Document"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>

                      {doc.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleQuickAction(doc.id, 'approved')}
                            disabled={updating}
                            className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50"
                            title="Quick Approve"
                          >
                            <FaCheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleQuickAction(doc.id, 'rejected')}
                            disabled={updating}
                            className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                            title="Quick Reject"
                          >
                            <FaTimesCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FaFileAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">No documents found</p>
              <p className="text-gray-400">
                {filterStatus === 'all' 
                  ? 'No documents have been uploaded yet.'
                  : `No ${filterStatus} documents found.`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {reviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Review Document</h3>
                <button
                  onClick={() => {
                    setReviewModal(false)
                    setSelectedDocument(null)
                    setReviewNotes('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Document:</label>
                  <p className="text-gray-900">{selectedDocument.filename || 'Untitled Document'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee:</label>
                  <p className="text-gray-900">
                    {selectedDocument.employee?.first_name && selectedDocument.employee?.last_name
                      ? `${selectedDocument.employee.first_name} ${selectedDocument.employee.last_name}`
                      : 'Unknown User'
                    } ({selectedDocument.employee?.email || 'No email'})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category:</label>
                  <p className="text-gray-900 capitalize">{selectedDocument.category || 'Uncategorized'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Department:</label>
                  <p className="text-gray-900">{selectedDocument.department || 'Not specified'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description:</label>
                  <p className="text-gray-900">{selectedDocument.description || 'No description provided'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Status:</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDocument.status)}`}>
                    {selectedDocument.status ? selectedDocument.status.charAt(0).toUpperCase() + selectedDocument.status.slice(1) : 'Unknown'}
                  </span>
                </div>

                {selectedDocument.file_path && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Document Actions:</label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => viewDocument(selectedDocument)}
                        className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <FaExternalLinkAlt className="mr-2 h-4 w-4" />
                        View Document
                      </button>
                      <button
                        onClick={() => downloadDocument(selectedDocument)}
                        className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                      >
                        <FaDownload className="mr-2 h-4 w-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(selectedDocument)}
                        disabled={deleting}
                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {deleting ? (
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                        ) : (
                          <FaTrash className="mr-2 h-4 w-4" />
                        )}
                        {deleting ? 'Deleting...' : 'Delete Document'}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes:
                  </label>
                  <textarea
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add review notes (optional)..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setReviewModal(false)
                    setSelectedDocument(null)
                    setReviewNotes('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReviewDocument('rejected')}
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
                >
                  {updating && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                  <FaTimesCircle className="h-4 w-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleReviewDocument('approved')}
                  disabled={updating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
                >
                  {updating && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                  <FaCheckCircle className="h-4 w-4" />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HRDashboard
