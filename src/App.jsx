import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navigation from './components/Navigation'
import Login from './pages/Login'
import Register from './pages/Register'
import EmployeeDashboard from './pages/EmployeeDashboard'
import HRDashboard from './pages/HRDashboard'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
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
              path="/hr-dashboard" 
              element={
                <ProtectedRoute requiredRole="hr">
                  <Navigation />
                  <HRDashboard />
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
