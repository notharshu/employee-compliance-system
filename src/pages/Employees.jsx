import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { FaSearch, FaEye, FaTrash, FaTimes } from 'react-icons/fa'

const Employees = () => {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [designationFilter, setDesignationFilter] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [viewModal, setViewModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Check if user has permission (General Manager or Manager)
    if (user && userProfile && 
        (userProfile.designation === 'general_manager' || userProfile.designation === 'manager')) {
      fetchEmployees()
    }
  }, [user, userProfile])

  useEffect(() => {
    filterEmployees()
  }, [searchTerm, designationFilter, employees])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      // Fetch ALL employees from ALL departments (no department filtering)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          middle_name,
          last_name,
          email,
          department,
          designation,
          date_of_joining,
          created_at,
          profile_completed,
          phone_number,
          gender,
          blood_group,
          emergency_contact_name,
          emergency_contact_phone,
          permanent_address,
          current_address,
          reporting_manager,
          work_location,
          shift_timing
        `)
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return
      }

      console.log('Raw profiles data:', profiles)

      // Fetch document counts
      const { data: documents } = await supabase
        .from('documents')
        .select('uploaded_by')

      // Count documents per employee
      const documentCounts = {}
      documents?.forEach(doc => {
        if (doc.uploaded_by) {
          documentCounts[doc.uploaded_by] = (documentCounts[doc.uploaded_by] || 0) + 1
        }
      })

      // Transform profiles to employee format
      const transformedEmployees = profiles.map(profile => ({
        ...profile,
        name: [profile.first_name, profile.middle_name, profile.last_name]
          .filter(Boolean)
          .join(' ') || profile.email || 'N/A',
        joinedDate: profile.date_of_joining
          ? new Date(profile.date_of_joining).toLocaleDateString()
          : new Date(profile.created_at).toLocaleDateString(),
        documentsCount: documentCounts[profile.id] || 0,
        status: profile.profile_completed ? 'active' : 'incomplete'
      }))

      console.log('Transformed employees:', transformedEmployees)
      setEmployees(transformedEmployees)
      setFilteredEmployees(transformedEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by designation
    if (designationFilter !== 'all') {
      filtered = filtered.filter(emp => emp.designation === designationFilter)
    }

    setFilteredEmployees(filtered)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDesignationColor = (designation) => {
    switch (designation) {
      case 'general_manager':
        return 'bg-purple-100 text-purple-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'assistant_manager':
        return 'bg-indigo-100 text-indigo-800'
      case 'deputy_manager':
        return 'bg-cyan-100 text-cyan-800'
      case 'management_trainee':
        return 'bg-pink-100 text-pink-800'
      case 'officer':
        return 'bg-green-100 text-green-800'
      case 'sr_officer':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee)
    setViewModal(true)
  }

  const handleViewDocuments = (employeeId) => {
    navigate(`/employee-documents/${employeeId}`)
  }

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone and will also delete all their documents.`)) {
      return
    }

    try {
      setDeleting(true)

      // First delete all documents associated with this employee
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('uploaded_by', employee.id)

      if (documentsError) {
        console.error('Error deleting employee documents:', documentsError)
        // Continue with profile deletion even if documents deletion fails
      }

      // Delete the employee profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employee.id)

      if (profileError) {
        console.error('Error deleting employee:', profileError)
        alert('Error deleting employee: ' + profileError.message)
        return
      }

      // Refresh the employee list
      await fetchEmployees()
      alert('Employee deleted successfully!')
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('Error deleting employee: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const closeModal = () => {
    setViewModal(false)
    setSelectedEmployee(null)
  }

  // Check access permission - Allow General Managers and Managers
  if (!userProfile || 
      (userProfile.designation !== 'general_manager' && userProfile.designation !== 'manager')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600">
              You don't have permission to access the Employee Management page. 
              This page is only available for General Managers and Managers.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
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
            Employee Management - All Departments
          </h1>
          <p className="text-gray-600">
            Manage employee profiles and information across all departments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(emp => emp.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Incomplete Profiles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(emp => emp.status === 'incomplete').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Managers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(emp => 
                    emp.designation === 'general_manager' || 
                    emp.designation === 'manager' ||
                    emp.designation === 'assistant_manager' ||
                    emp.designation === 'deputy_manager'
                  ).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees by name, email, department, or designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Designations</option>
                <option value="general_manager">General Manager</option>
                <option value="manager">Manager</option>
                <option value="assistant_manager">Assistant Manager</option>
                <option value="deputy_manager">Deputy Manager</option>
                <option value="management_trainee">Management Trainee</option>
                <option value="officer">Officer</option>
                <option value="sr_officer">Sr. Officer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                        <div className="text-xs text-gray-400">
                          {employee.department || 'Not Assigned'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDesignationColor(employee.designation)}`}>
                        {employee.designation?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                        {employee.status?.charAt(0).toUpperCase() + employee.status?.slice(1) || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.joinedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewDocuments(employee.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {employee.documentsCount} docs
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {employee.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteEmployee(employee)}
                            disabled={deleting}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Delete Employee"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || designationFilter !== 'all'
                  ? 'Try adjusting your search criteria.'
                  : 'No employees have been added to the system yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      {viewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Employee Details</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Personal Information</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Name:</span> {selectedEmployee.name}</div>
                  <div><span className="font-medium">Email:</span> {selectedEmployee.email || 'N/A'}</div>
                  <div><span className="font-medium">Phone:</span> {selectedEmployee.phone_number || 'N/A'}</div>
                  <div><span className="font-medium">Gender:</span> {selectedEmployee.gender || 'N/A'}</div>
                  <div><span className="font-medium">Blood Group:</span> {selectedEmployee.blood_group || 'N/A'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Employment Information</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Department:</span> {selectedEmployee.department || 'Not Assigned'}</div>
                  <div><span className="font-medium">Designation:</span> {selectedEmployee.designation?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not Assigned'}</div>
                  <div><span className="font-medium">Reporting Manager:</span> {selectedEmployee.reporting_manager || 'N/A'}</div>
                  <div><span className="font-medium">Work Location:</span> {selectedEmployee.work_location || 'N/A'}</div>
                  <div><span className="font-medium">Shift Timing:</span> {selectedEmployee.shift_timing || 'N/A'}</div>
                  <div><span className="font-medium">Joined Date:</span> {selectedEmployee.joinedDate}</div>
                  <div><span className="font-medium">Documents:</span> {selectedEmployee.documentsCount} documents</div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Permanent Address:</span>
                    <p className="text-gray-600">{selectedEmployee.permanent_address || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Current Address:</span>
                    <p className="text-gray-600">{selectedEmployee.current_address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="font-medium">Name:</span> {selectedEmployee.emergency_contact_name || 'N/A'}</div>
                  <div><span className="font-medium">Phone:</span> {selectedEmployee.emergency_contact_phone || 'N/A'}</div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div><span className="font-medium">Profile Completed:</span> {selectedEmployee.profile_completed ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
