import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, DOCUMENT_CATEGORIES, DOCUMENT_STATUS } from '../utils/supabase'
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle, FaEye, FaTrash } from 'react-icons/fa'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: '',
    expirationDate: '',
    expirationDateValue: '',
    department: '',
    file: null
  })

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newDocument.file) {
      alert('Please select a file to upload.')
      return
    }
    if (!newDocument.title) {
      alert('Please enter a document title.')
      return
    }
    if (!newDocument.category) {
      alert('Please select a document category.')
      return
    }
    if (!newDocument.department) {
      alert('Please enter the department.')
      return
    }
    
    // Validate expiration date if "Set Expiration Date" is selected
    if (newDocument.expirationDate === 'date' && !newDocument.expirationDateValue) {
      alert('Please select an expiration date.')
      return
    }

    try {
      setUploading(true)
      console.log('Starting document upload...')
      
      // First, try to create the document record without file upload
      // This helps us identify if the issue is with storage or database
      const documentData = {
        employee_id: user.id,
        title: newDocument.title,
        description: newDocument.description || '',
        category: newDocument.category,
        department: newDocument.department,
        file_name: newDocument.file.name,
        file_size: newDocument.file.size,
        mime_type: newDocument.file.type,
        status: 'pending'
      }

      // Add expiration date if provided
      if (newDocument.expirationDate === 'date' && newDocument.expirationDateValue) {
        documentData.expiry_date = newDocument.expirationDateValue
      }

      console.log('Document data to insert:', documentData)
      
      // Try to upload file to storage first - with multiple fallback attempts
      const fileExt = newDocument.file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      console.log('Uploading file to storage:', fileName)
      
      let uploadData = null
      let uploadError = null
      
      // First attempt: Try 'documents' bucket
      const uploadResult = await supabase.storage
        .from('documents')
        .upload(fileName, newDocument.file, {
          cacheControl: '3600',
          upsert: false
        })
      
      uploadData = uploadResult.data
      uploadError = uploadResult.error
      
      // If documents bucket fails, try creating a public bucket as fallback
      if (uploadError && (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket'))) {
        console.log('Documents bucket not found, trying to create one or use alternative...')
        
        // Try to create a public documents bucket as fallback
        const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('documents', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        })
        
        if (!bucketError) {
          console.log('Successfully created documents bucket, retrying upload...')
          const retryResult = await supabase.storage
            .from('documents')
            .upload(fileName, newDocument.file, {
              cacheControl: '3600',
              upsert: false
            })
          uploadData = retryResult.data
          uploadError = retryResult.error
        }
      }
      
      // If still failing, try without the folder structure
      if (uploadError) {
        console.log('Retrying upload without folder structure...')
        const simpleFileName = `${Date.now()}.${fileExt}`
        const simpleResult = await supabase.storage
          .from('documents')
          .upload(simpleFileName, newDocument.file, {
            cacheControl: '3600',
            upsert: false
          })
        uploadData = simpleResult.data
        uploadError = simpleResult.error
      }

      // Final fallback: Store document metadata without file if storage completely fails
      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        
        // Ask user if they want to proceed without file storage
        const proceedWithoutStorage = confirm(
          'File storage is not available. Would you like to save the document information without the file? You can upload the file later when storage is available.'
        )
        
        if (proceedWithoutStorage) {
          console.log('Proceeding without file storage...')
          documentData.file_url = null
          documentData.storage_error = uploadError.message
        } else {
          throw new Error(`File upload failed: ${uploadError.message}`)
        }
      } else {
        // Add file URL to document data on successful upload
        documentData.file_url = uploadData.path
      }

      console.log('File upload process completed:', uploadData ? 'Success' : 'Stored without file')

      // Insert document record
      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()

      if (insertError) {
        console.error('Database insert error:', insertError)
        
        // Clean up uploaded file if database insert fails
        if (uploadData?.path) {
          await supabase.storage
            .from('documents')
            .remove([uploadData.path])
        }
          
        throw new Error(`Database error: ${insertError.message}`)
      }

      console.log('Document inserted successfully:', insertData)
      
      // Success!
      alert('Document uploaded successfully!')
      setUploadModal(false)
      setNewDocument({ 
        title: '', 
        description: '', 
        category: '', 
        expirationDate: '', 
        expirationDateValue: '', 
        department: '', 
        file: null 
      })
      
      // Refresh documents list
      await fetchDocuments()
      
    } catch (error) {
      console.error('Error uploading document:', error)
      alert(`Error uploading document: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const viewDocument = async (doc) => {
    try {
      // Create signed URL for viewing (1 hour access)
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url, 3600)

      if (error) {
        console.error('Error creating signed URL:', error)
        alert('Error accessing document: ' + error.message)
        return
      }

      if (data.signedUrl) {
        // Open document in new tab
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
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const handleDeleteDocument = async (doc) => {
    const documentName = doc.title || doc.file_name || 'this document'
    
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
        .eq('employee_id', user.id) // Ensure user can only delete their own documents

      if (dbError) {
        console.error('Database deletion error:', dbError)
        throw new Error(`Failed to delete document: ${dbError.message}`)
      }

      // Delete from storage if file exists
      if (doc.file_url) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_url])
        
        if (storageError) {
          console.warn('Storage deletion warning:', storageError)
        }
      }

      // Refresh documents list
      await fetchDocuments()
      alert('Document deleted successfully!')

    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
        <button
          onClick={() => setUploadModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          Upload Document
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 justify-center">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex flex-col items-center">
            <FaFileAlt className="text-3xl mb-3 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-700">Total Documents</h3>
            <p className="text-3xl font-bold text-primary-600">{documents.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex flex-col items-center">
            <FaClock className="text-3xl mb-3 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-700">Pending Review</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {documents.filter(d => d.status === 'pending').length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex flex-col items-center">
            <FaCheckCircle className="text-3xl mb-3 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-700">Approved</h3>
            <p className="text-3xl font-bold text-green-600">
              {documents.filter(d => d.status === 'approved').length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex flex-col items-center">
            <FaTimesCircle className="text-3xl mb-3 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-700">Rejected</h3>
            <p className="text-3xl font-bold text-red-600">
              {documents.filter(d => d.status === 'rejected').length}
            </p>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
              <tr key={doc.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                    <div className="text-sm text-gray-500">{doc.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.category}
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
                  <div className="flex space-x-2">
                    {/* View Document Button */}
                    <button
                      onClick={() => viewDocument(doc)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-200"
                      title="View Document"
                    >
                      <FaEye className="h-4 w-4" />
                    </button>

                    {/* Delete Document Button */}
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50 transition-colors duration-200"
                      title="Delete Document"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {documents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No documents uploaded yet.</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Document</h3>
            <form onSubmit={handleFileUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={newDocument.category}
                  onChange={(e) => setNewDocument({...newDocument, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={newDocument.department}
                  onChange={(e) => setNewDocument({...newDocument, department: e.target.value})}
                  placeholder="e.g. IT, HR, Finance"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={newDocument.expirationDate}
                  onChange={(e) => setNewDocument({...newDocument, expirationDate: e.target.value, expirationDateValue: e.target.value === 'NA' ? 'NA' : ''})}
                >
                  <option value="">Select Expiration Type</option>
                  <option value="NA">NA (No Expiration)</option>
                  <option value="date">Set Expiration Date</option>
                </select>
              </div>
              {newDocument.expirationDate === 'date' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Select Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    value={newDocument.expirationDateValue}
                    onChange={(e) => setNewDocument({...newDocument, expirationDateValue: e.target.value})}
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">File <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  required
                  className="mt-1 block w-full"
                  onChange={(e) => setNewDocument({...newDocument, file: e.target.files[0]})}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
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
