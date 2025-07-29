import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navigation from './components/Navigation'
import Login from './pages/Login'
import ComprehensiveRegister from './pages/ComprehensiveRegister'
import ResendConfirmation from './pages/ResendConfirmation'
import Profile from './pages/Profile'
import EmployeeDashboard from './pages/EmployeeDashboard'
import GeneralManagerDashboard from './pages/GeneralManagerDashboard'
import Employees from './pages/Employees'
import EmployeeDocuments from './pages/EmployeeDocuments'
import CompanyPolicies from './pages/CompanyPolicies'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<ComprehensiveRegister />} />
            <Route path="/resend-confirmation" element={<ResendConfirmation />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/company-policies"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <CompanyPolicies />
                </ProtectedRoute>
              }
            />

            <Route
              path="/general-manager-dashboard"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <GeneralManagerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Employees />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employee-documents/:id"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <EmployeeDocuments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <EmployeeDocuments />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch all route - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
