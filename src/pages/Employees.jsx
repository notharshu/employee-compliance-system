import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { FaSearch, FaEye, FaTrash, FaTimes } from 'react-icons/fa'

const Employees = () => {
  const { user, userProfile } = useAuth()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [viewModal, setViewModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [searchTerm, roleFilter, employees])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      // Fetch all profiles (including HR) with comprehensive data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          middle_name,
          last_name,
          email,
          role,
          department,
          designation,
          date_of_joining,
          created_at,
          profile_completed,
          phone_number,
          employee_id,
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

      console.log('Raw profiles data:', profiles) // Debug log

      // Fetch document counts
      const { data: documents } = await supabase
        .from('documents')
        .select('employee_id')

      // Count documents per employee
      const documentCounts = {}
      documents?.forEach(doc => {
        if (doc.employee_id) {
          documentCounts[doc.employee_id] = (documentCounts[doc.employee_id] || 0) + 1
        }
      })

      // Transform profiles to employee format
      const transformedEmployees = profiles.map(profile => ({
        ...profile, // Keep all original profile data for modal
        name: [profile.first_name, profile.middle_name, profile.last_name]
          .filter(Boolean)
          .join(' ') || profile.email || 'N/A',
        joinedDate: profile.date_of_joining 
          ? new Date(profile.date_of_joining).toLocaleDateString()
          : new Date(profile.created_at).toLocaleDateString(),
        documentsCount: documentCounts[profile.id] || 0,
        status: profile.profile_completed ? 'active' : 'incomplete'
      }))

      console.log('Transformed employees:', transformedEmployees) // Debug log

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
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(emp => emp.role === roleFilter)
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

  const getRoleColor = (role) => {
    switch (role) {
      case 'hr':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'employee':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee)
    setViewModal(true)
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
        .eq('employee_id', employee.id)

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
          <p className="text-red-700">You don't have permission to access the Employee Management page. This page is only available for HR personnel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
        <p className="text-gray-600">Manage employee profiles and information</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <FaEye className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <FaEye className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {employees.filter(emp => emp.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <FaEye className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Incomplete Profiles</p>
              <p className="text-2xl font-semibold text-gray-900">
                {employees.filter(emp => emp.status === 'incomplete').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <FaEye className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">HR Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {employees.filter(emp => emp.role === 'hr').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search employees..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Roles</option>
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
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
                      <div className="text-sm text-gray-500">
                        {employee.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {employee.department || 'Not Assigned'} • {employee.designation || 'Not Assigned'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(employee.role)}`}>
                      {employee.role?.toUpperCase() || 'EMPLOYEE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                      {employee.status?.charAt(0).toUpperCase() + employee.status?.slice(1) || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.joinedDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                      {employee.documentsCount} docs
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Employee Profile"
                      >
                        <FaEye className="h-4 w-4" />
                      </button>
                      {employee.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                          title="Delete Employee"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <FaEye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">No employees found</p>
              <p className="text-gray-400">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search criteria.'
                  : 'No employees have been added to the system yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Employee View Modal */}
      {viewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Employee Profile</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{selectedEmployee.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedEmployee.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="text-gray-900">{selectedEmployee.phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <p className="text-gray-900 capitalize">{selectedEmployee.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                      <p className="text-gray-900">{selectedEmployee.blood_group || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                      <p className="text-gray-900">{selectedEmployee.employee_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Work Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Work Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <p className="text-gray-900">{selectedEmployee.department || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Designation</label>
                      <p className="text-gray-900">{selectedEmployee.designation || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedEmployee.role)}`}>
                        {selectedEmployee.role?.toUpperCase() || 'EMPLOYEE'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reporting Manager</label>
                      <p className="text-gray-900">{selectedEmployee.reporting_manager || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Work Location</label>
                      <p className="text-gray-900">{selectedEmployee.work_location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Shift Timing</label>
                      <p className="text-gray-900">{selectedEmployee.shift_timing || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                      <p className="text-gray-900">{selectedEmployee.joinedDate}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Documents Uploaded</label>
                      <p className="text-gray-900">{selectedEmployee.documentsCount} documents</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
                      <p className="text-gray-900">{selectedEmployee.permanent_address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Address</label>
                      <p className="text-gray-900">{selectedEmployee.current_address || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                        <p className="text-gray-900">{selectedEmployee.emergency_contact_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                        <p className="text-gray-900">{selectedEmployee.emergency_contact_phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Profile Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profile Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEmployee.status)}`}>
                        {selectedEmployee.status?.charAt(0).toUpperCase() + selectedEmployee.status?.slice(1) || 'Active'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profile Completed</label>
                      <p className="text-gray-900">{selectedEmployee.profile_completed ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
