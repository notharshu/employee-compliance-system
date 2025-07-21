import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CompanyLogo from '../assets/company-logo.svg';

const Navigation = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) => {
    const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200';
    return isActive(path)
      ? `${base} bg-primary-100 text-primary-700`
      : `${base} text-gray-700 hover:text-primary-600 hover:bg-gray-100`;
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <img src={CompanyLogo} alt="Company Logo" className="h-10 w-auto" />
            </Link>
          </div>

          {/* links + user area */}
          {user && (
            <div className="flex items-center space-x-6">
              {/* main nav links */}
              <ul className="flex space-x-4">
                <li>
                  <Link
                    to="/dashboard"
                    className={navLinkClass('/dashboard')}
                  >
                    Dashboard
                  </Link>
                </li>

                {userProfile?.role === 'hr' && (
                  <li className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`${navLinkClass('/hr-dashboard')} flex items-center space-x-1`}
                      onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                    >
                      <span>HR Dashboard</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {dropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <Link
                          to="/hr-dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setDropdownOpen(false)}
                        >
                          HR Dashboard
                        </Link>
                        <Link
                          to="/employees"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Employees
                        </Link>
                      </div>
                    )}
                  </li>
                )}

                <li>
                  <Link to="/profile" className={navLinkClass('/profile')}>
                    Profile
                  </Link>
                </li>
              </ul>

              {/* user info + sign-out */}
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {userProfile?.first_name && userProfile?.last_name
                        ? `${userProfile.first_name} ${userProfile.last_name}`
                        : user.email}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {userProfile?.designation || userProfile?.role || 'Employee'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;