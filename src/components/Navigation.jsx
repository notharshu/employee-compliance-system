import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CompanyLogo from '../assets/company-logo.svg'

const Navigation = () => {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
        alert('Error signing out: ' + error.message)
      } else {
        navigate('/login')
      }
    } catch (err) {
      console.error('Unexpected sign out error:', err)
    }
  }

  const isActive = (path) => location.pathname === path

  const navLinkClass = (path) => {
    const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200'
    return isActive(path) ? `${base} bg-primary-100 text-primary-700` : `${base} text-gray-700 hover:text-primary-600 hover:bg-gray-100`
  }

  const isGeneralManager = userProfile?.designation === 'general_manager'
  const canViewEmployees = userProfile?.designation === 'general_manager' || userProfile?.designation === 'manager'

  return (
    <nav className="bg-white shadow px-8 py-4 flex items-center justify-between">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center">
        <img className="h-12 w-auto" src={CompanyLogo} alt="Company Logo" />
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center space-x-8">
        <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
        <Link to="/company-policies" className={navLinkClass('/company-policies')}>Policies</Link>

        {/* General Manager Dropdown */}
        {isGeneralManager && (
          <div 
            className="relative"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button className={navLinkClass('/general-manager-dashboard')}>
              Manage
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <Link to="/general-manager-dashboard" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">Documents</Link>
                <Link to="/employees" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">Employees</Link>
              </div>
            )}
          </div>
        )}

        {/* Employees link for Managers (not GM, as GM has it in dropdown) */}
        {canViewEmployees && !isGeneralManager && (
          <Link to="/employees" className={navLinkClass('/employees')}>Employees</Link>
        )}

        {/* Profile */}
        <Link to="/profile" className={navLinkClass('/profile')}>Profile</Link>
      </div>

      {/* User Info and Sign Out */}
      <div className="flex items-center space-x-4">
        {user && (
          <>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {userProfile?.first_name && userProfile?.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : user.email}
              </div>
              <div className="text-sm text-gray-600">
                {userProfile?.designation?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Employee'}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navigation
