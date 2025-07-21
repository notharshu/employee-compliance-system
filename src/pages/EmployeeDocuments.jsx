import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { FiArrowLeft, FiDownload, FiEye, FiFilter } from 'react-icons/fi';

const EmployeeDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchEmployeeAndDocuments();
  }, [id]);

  const fetchEmployeeAndDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch employee details
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (employeeError) throw employeeError;
      setEmployee(employeeData);

      // Fetch documents for this employee
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('employee_id', id)
        .order('uploaded_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDocumentTypeIcon = (type) => {
    const icons = {
      'application/pdf': '📄',
      'image/jpeg': '🖼️',
      'image/png': '🖼️',
      'image/gif': '🖼️',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.ms-excel': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊'
    };
    return icons[type] || '📎';
  };

  const handleDownload = async (document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleView = async (document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 300);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error viewing file. Please try again.');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filterStatus === 'all') return true;
    return doc.approval_status === filterStatus;
  });

  const getStatusCounts = () => {
    return {
      all: documents.length,
      approved: documents.filter(doc => doc.approval_status === 'approved').length,
      pending: documents.filter(doc => doc.approval_status === 'pending').length,
      rejected: documents.filter(doc => doc.approval_status === 'rejected').length
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Employee Not Found</h2>
          <button
            onClick={() => navigate('/employees')}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            ← Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/employees')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FiArrowLeft className="h-5 w-5 mr-2" />
                Back to Employees
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {employee.first_name} {employee.last_name}
                </h1>
                <p className="text-sm text-gray-600">
                  {employee.email} • {employee.role} • {employee.department}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filter Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
            <div className="flex items-center space-x-2">
              <FiFilter className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Filter by status:</span>
            </div>
          </div>
          
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: 'all', label: `All (${statusCounts.all})` },
              { key: 'approved', label: `Approved (${statusCounts.approved})` },
              { key: 'pending', label: `Pending (${statusCounts.pending})` },
              { key: 'rejected', label: `Rejected (${statusCounts.rejected})` }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterStatus === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No documents found' : `No ${filterStatus} documents`}
            </h3>
            <p className="text-gray-600">
              {filterStatus === 'all' 
                ? 'This employee hasn\'t uploaded any documents yet.'
                : `This employee has no ${filterStatus} documents.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getDocumentTypeIcon(document.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {document.file_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {document.document_type}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(document.approval_status)}
                  </div>

                  {document.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {document.description}
                    </p>
                  )}

                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    <div>
                      Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                    </div>
                    {document.reviewed_at && (
                      <div>
                        Reviewed: {new Date(document.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {document.review_notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-xs font-medium text-gray-700 mb-1">Review Notes:</p>
                      <p className="text-sm text-gray-600">{document.review_notes}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(document)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <FiEye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(document)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <FiDownload className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDocuments;
