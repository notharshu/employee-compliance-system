import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle, FaDownload, FaEye, FaTrash, FaExternalLinkAlt } from 'react-icons/fa'

const GeneralManagerDashboard = () => {
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
    // Check if user is a General Manager
    if (user && userProfile?.designation === 'general_manager') {
      fetchDepartmentDocuments()
    }
  }, [user, userProfile])

const fetchDepartmentDocuments = async () => {
  try {
    setLoading(true)
    
    console.log('Fetching documents for department:', userProfile?.department)
    
    // Get documents first
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('department', userProfile.department)
      .order('created_at', { ascending: false })

    if (docsError) throw docsError

    console.log('Found documents:', docs)

    // For each document, fetch the profile separately
    const documentsWithProfiles = []
    
    for (const doc of docs) {
      let profile = null
      
      if (doc.uploaded_by) {
        console.log('Fetching profile for uploaded_by:', doc.uploaded_by)
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, designation, department')
          .eq('id', doc.uploaded_by)
          .maybeSingle()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        } else if (profileData) {
          console.log('Found profile:', profileData)
          profile = profileData
        } else {
          console.log('No profile found for ID:', doc.uploaded_by)
        }
      }

      documentsWithProfiles.push({
        ...doc,
        uploaded_by_profile: profile
      })
    }

    console.log('Final documents with profiles:', documentsWithProfiles)
    setDocuments(documentsWithProfiles)

    // Calculate stats
    const totalDocs = documentsWithProfiles.length || 0
    const pendingDocs = documentsWithProfiles.filter(doc => doc.status === 'pending').length || 0
    const approvedDocs = documentsWithProfiles.filter(doc => doc.status === 'approved').length || 0
    const rejectedDocs = documentsWithProfiles.filter(doc => doc.status === 'rejected').length || 0

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
          rejection_reason: reviewNotes || null,
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', selectedDocument.id)

      if (error) {
        console.error('Error updating document:', error)
        throw error
      }

      setReviewModal(false)
      setSelectedDocument(null)
      setReviewNotes('')
      await fetchDepartmentDocuments()
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
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', documentId)

      if (error) {
        console.error('Error updating document:', error)
        throw error
      }

      await fetchDepartmentDocuments()
      alert(`Document ${action === 'approved' ? 'approved' : 'rejected'} successfully!`)
    } catch (error) {
      console.error('Error updating document:', error)
      alert('Error updating document status: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteDocument = async (doc) => {
    const documentName = doc.title || doc.filename || 'this document'
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      console.log('Attempting to delete document with ID:', doc.id)

      const { data, error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .select()

      if (dbError) {
        console.error('Database deletion error:', dbError)
        throw new Error(`Database deletion failed: ${dbError.message}`)
      }

      console.log('Deleted from database:', data)

      if (!data || data.length === 0) {
        throw new Error('No document was deleted - document may not exist or you may not have permission')
      }

      // Delete file from storage if exists
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path])

        if (storageError) {
          console.warn('Storage deletion warning (non-critical):', storageError)
        } else {
          console.log('File deleted from storage successfully')
        }
      }

      // Close modal if this document was selected
      if (reviewModal && selectedDocument?.id === doc.id) {
        setReviewModal(false)
        setSelectedDocument(null)
        setReviewNotes('')
      }

      // Update local state
      setDocuments(prevDocs => prevDocs.filter(d => d.id !== doc.id))
      setStats(prevStats => {
        const newStats = { ...prevStats }
        newStats.total = Math.max(0, newStats.total - 1)
        if (doc.status === 'pending') {
          newStats.pending = Math.max(0, newStats.pending - 1)
        } else if (doc.status === 'approved') {
          newStats.approved = Math.max(0, newStats.approved - 1)
        } else if (doc.status === 'rejected') {
          newStats.rejected = Math.max(0, newStats.rejected - 1)
        }
        return newStats
      })

      alert('Document deleted successfully!')
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document: ' + error.message)
      await fetchDepartmentDocuments()
    } finally {
      setDeleting(false)
    }
  }

  const downloadDocument = async (doc) => {
    if (!doc.file_path) {
      alert('File not available for download')
      return
    }

    try {
      console.log('Downloading file from path:', doc.file_path)

      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path)

      if (error) {
        console.error('Download error:', error)
        alert('Error downloading document: ' + error.message)
        return
      }

      if (!data) {
        alert('No file data received')
        return
      }

      const url = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = doc.filename || doc.title || 'document'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      console.log('File downloaded successfully')
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error downloading document: ' + error.message)
    }
  }

  const viewDocument = async (doc) => {
    if (!doc.file_path) {
      alert('File not available for viewing')
      return
    }

    try {
      // Create signed URL for viewing
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600)

      if (error) {
        console.error('Error creating signed URL:', error)
        throw error
      }

      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank')
        return
      }

      alert('Unable to generate viewing URL for this document')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    )
  }

  // Check if user is a General Manager
  if (!userProfile || userProfile.designation !== 'general_manager') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600">
              You don't have permission to access the General Manager Dashboard. 
              This page is only available for General Managers.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Manage Documents
          </h1>
          <p className="text-gray-600">
            Review and manage documents
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaFileAlt className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaClock className="text-yellow-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FaTimesCircle className="text-red-600 text-2xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filterStatus === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filterStatus === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected ({stats.rejected})
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow-sm">
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
                    Type
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
                          {doc.uploaded_by_profile?.first_name && doc.uploaded_by_profile?.last_name
                            ? `${doc.uploaded_by_profile.first_name} ${doc.uploaded_by_profile.last_name}`
                            : 'Unknown User'
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {doc.uploaded_by_profile?.email || 'No email available'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {doc.uploaded_by_profile?.designation || 'Employee'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {doc.title || doc.filename || 'Untitled Document'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {doc.description || 'No description'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {doc.document_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                        {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {doc.file_path && (
                          <>
                            <button
                              onClick={() => viewDocument(doc)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Document"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => downloadDocument(doc)}
                              className="text-green-600 hover:text-green-900"
                              title="Download Document"
                            >
                              <FaDownload />
                            </button>
                          </>
                        )}
                        {doc.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedDocument(doc)
                                setReviewModal(true)
                              }}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Review Document"
                            >
                              <FaExternalLinkAlt />
                            </button>
                            <button
                              onClick={() => handleQuickAction(doc.id, 'approved')}
                              disabled={updating}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Quick Approve"
                            >
                              <FaCheckCircle />
                            </button>
                            <button
                              onClick={() => handleQuickAction(doc.id, 'rejected')}
                              disabled={updating}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Quick Reject"
                            >
                              <FaTimesCircle />
                            </button>
                          </>
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

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FaFileAlt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterStatus === 'all'
                  ? 'No documents have been uploaded to your department yet.'
                  : `No ${filterStatus} documents found in your department.`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Review Document
            </h3>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-900">
                {selectedDocument.title || selectedDocument.filename || 'Untitled Document'}
              </h4>
              <p className="text-sm text-gray-600">
                Uploaded by: {selectedDocument.uploaded_by_profile?.first_name && selectedDocument.uploaded_by_profile?.last_name
                  ? `${selectedDocument.uploaded_by_profile.first_name} ${selectedDocument.uploaded_by_profile.last_name}`
                  : 'Unknown User'
                } ({selectedDocument.uploaded_by_profile?.email || 'No email'})
              </p>
              <p className="text-sm text-gray-600">
                Type: {selectedDocument.document_type || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                Department: {selectedDocument.department || 'Not specified'}
              </p>
              {selectedDocument.description && (
                <p className="text-sm text-gray-600 mt-2">
                  Description: {selectedDocument.description}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add notes about your decision..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setReviewModal(false)
                  setSelectedDocument(null)
                  setReviewNotes('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewDocument('rejected')}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => handleReviewDocument('approved')}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GeneralManagerDashboard
