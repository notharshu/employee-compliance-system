import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navigation = () => {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  const navLinkClass = (path) => {
    const baseClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
    return isActive(path) 
      ? `${baseClass} bg-primary-100 text-primary-700`
      : `${baseClass} text-gray-700 hover:text-primary-600 hover:bg-gray-100`
  }

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Employee Compliance
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/dashboard"
                    className={navLinkClass('/dashboard')}
                  >
                    Dashboard
                  </Link>
                  
                  {userProfile?.role === 'hr' && (
                    <Link
                      to="/hr-dashboard"
                      className={navLinkClass('/hr-dashboard')}
                    >
                      HR Dashboard
                    </Link>
                  )}
                </div>

                <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {user.email}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {userProfile?.role || 'Employee'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
