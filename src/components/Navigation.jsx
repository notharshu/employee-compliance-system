import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CompanyLogo from '../assets/company-logo.svg';

const Navigation = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Check if user is General Manager
  const isGeneralManager = userProfile?.designation === 'general_manager';
  
  // Check if user is Manager or General Manager (for employee access)
  const canViewEmployees = userProfile?.designation === 'general_manager' || userProfile?.designation === 'manager';

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
              <img className="h-8 w-auto" src={CompanyLogo} alt="Company" />
            </Link>
          </div>

          {/* Links + User area */}
          {user && (
            <div className="flex items-center space-x-4">
              {/* Main nav links */}
              <div className="flex space-x-1">
                <Link
                  to="/dashboard"
                  className={navLinkClass("/dashboard")}
                >
                  Dashboard
                </Link>

                <Link
                  to="/policies"
                  className={navLinkClass("/policies")}
                >
                  Policies
                </Link>

                {/* General Manager Navigation */}
                {isGeneralManager && (
  <div
    className="relative"
    onMouseEnter={() => setDropdownOpen(true)}
    onMouseLeave={() => setDropdownOpen(false)}
  >
    <Link
      to="/general-manager-dashboard"
      className={navLinkClass("/general-manager-dashboard")}
    >
      Manage
    </Link>

    {dropdownOpen && (
      <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
        <div className="py-1">
          <Link
            to="/general-manager-dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Documents
          </Link>
          <Link
            to="/employees"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Employees
          </Link>
        </div>
      </div>
    )}
  </div>
)}

                {/* Employees link for Managers (not General Managers, as they have it in dropdown) */}
                {canViewEmployees && !isGeneralManager && (
                  <Link
                    to="/employees"
                    className={navLinkClass("/employees")}
                  >
                    Employees
                  </Link>
                )}

                <Link
                  to="/profile"
                  className={navLinkClass("/profile")}
                >
                  Profile
                </Link>
              </div>

              {/* User info + sign-out */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {userProfile?.first_name && userProfile?.last_name
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : user.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {userProfile?.designation?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Employee'}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-700 hover:text-red-600 font-medium"
                >
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
