import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

const Register = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')

  const departments = [
    { value: 'systems', label: 'Systems' },
    { value: 'human_resources', label: 'Human Resources' },
    { value: 'finance_accounts', label: 'Finance & Accounts' },
    { value: 'legal', label: 'Legal' },
    { value: 'administration', label: 'Administration' },
    { value: 'mining_operations', label: 'Mining & Operations' },
    { value: 'marketing_sales', label: 'Marketing & Sales' },
    { value: 'medical', label: 'Medical' },
    { value: 'security', label: 'Security' }
  ]

  const designations = [
    { value: 'general_manager', label: 'General Manager' },
    { value: 'manager', label: 'Manager' },
    { value: 'assistant_manager', label: 'Assistant Manager' },
    { value: 'deputy_manager', label: 'Deputy Manager' },
    { value: 'management_trainee', label: 'Management Trainee' },
    { value: 'officer', label: 'Officer' },
    { value: 'sr_officer', label: 'Sr. Officer' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters long')
      setLoading(false)
      return
    }
    if (!firstName.trim() || !lastName.trim() || !department || !designation) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      // 1. Create user (no metadata)
      const { data: signUpData, error: signUpError } = await signUp(email.trim(), password)
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      if (!signUpData?.user) throw new Error('User creation failed')

      const userId = signUpData.user.id

      // 2. Insert profile record fully
      const profileData = {
        id: userId,
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
        department: department.trim(),
        designation: designation.trim(),
        profile_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Retry insertion (up to 5 times) for robustness
      let profileCreated = false
      for (let i = 0; i < 5; i++) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
        if (!profileError) {
          profileCreated = true
          break
        } else if (i === 4) {
          throw profileError
        }
        await new Promise(r => setTimeout(r, 2000))
      }

      if (profileCreated) {
        setSuccess('Account created successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      setError(`Registration failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow">
        <h2 className="text-3xl font-extrabold text-center text-gray-900">Create your account</h2>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address*</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password*</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password*</label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name*</label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name*</label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          {/* Department */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department*</label>
            <select
              id="department"
              required
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select Department</option>
              {departments.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {/* Designation */}
          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-gray-700">Designation*</label>
            <select
              id="designation"
              required
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select Designation</option>
              {designations.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 mt-2 text-center">{error}</p>}
          {success && <p className="text-green-600 mt-2 text-center">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
  )
}

export default Register
