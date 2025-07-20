import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'

const ComprehensiveRegister = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Account Information
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Personal Information
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  
  // Contact Information
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [currentAddress, setCurrentAddress] = useState('')
  
  // Employment Information
  const [employeeId, setEmployeeId] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [dateOfJoining, setDateOfJoining] = useState('')
  const [reportingManager, setReportingManager] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [shiftTiming, setShiftTiming] = useState('')
  
  // Compliance Information
  const [panNumber, setPanNumber] = useState('')
  const [aadharNumber, setAadharNumber] = useState('')
  const [pfNumber, setPfNumber] = useState('')
  const [esiNumber, setEsiNumber] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const departments = [
    { value: 'mining_operations', label: 'Mining Operations' },
    { value: 'safety_department', label: 'Safety Department' },
    { value: 'human_resources', label: 'Human Resources' },
    { value: 'finance_accounts', label: 'Finance & Accounts' },
    { value: 'engineering_technical', label: 'Engineering & Technical' },
    { value: 'environment_forestry', label: 'Environment & Forestry' },
    { value: 'medical_health', label: 'Medical & Health' },
    { value: 'security', label: 'Security' },
    { value: 'transport', label: 'Transport' },
    { value: 'stores_purchase', label: 'Stores & Purchase' },
    { value: 'legal', label: 'Legal' },
    { value: 'administration', label: 'Administration' },
    { value: 'it_systems', label: 'IT & Systems' }
  ]

  const designations = [
    { value: 'junior_engineer', label: 'Junior Engineer' },
    { value: 'assistant_engineer', label: 'Assistant Engineer' },
    { value: 'deputy_engineer', label: 'Deputy Engineer' },
    { value: 'assistant_manager', label: 'Assistant Manager' },
    { value: 'deputy_manager', label: 'Deputy Manager' },
    { value: 'manager', label: 'Manager' },
    { value: 'deputy_general_manager', label: 'Deputy General Manager' },
    { value: 'general_manager', label: 'General Manager' },
    { value: 'chief_general_manager', label: 'Chief General Manager' },
    { value: 'mining_foreman', label: 'Mining Foreman' },
    { value: 'mining_mate', label: 'Mining Mate' },
    { value: 'surveyor', label: 'Surveyor' },
    { value: 'safety_officer', label: 'Safety Officer' },
    { value: 'medical_officer', label: 'Medical Officer' },
    { value: 'security_officer', label: 'Security Officer' },
    { value: 'clerk', label: 'Clerk' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'technician', label: 'Technician' },
    { value: 'operator', label: 'Operator' },
    { value: 'driver', label: 'Driver' },
    { value: 'helper', label: 'Helper' },
    { value: 'other', label: 'Other' }
  ]

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        return email && password && confirmPassword && password === confirmPassword
      case 2:
        return firstName && lastName && dateOfBirth && gender
      case 3:
        return phoneNumber && permanentAddress
      case 4:
        return employeeId && department && designation && dateOfJoining
      case 5:
        return panNumber && aadharNumber
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setError('')
      setStep(step + 1)
    } else {
      setError('Please fill in all required fields')
    }
  }

  const prevStep = () => {
    setStep(step - 1)
    setError('')
  }

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

    try {
      const { data, error } = await signUp(email, password)
      
      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Create comprehensive profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: 'employee',
              
              // Personal Information
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              date_of_birth: dateOfBirth,
              gender: gender,
              blood_group: bloodGroup,
              
              // Contact Information
              phone_number: phoneNumber,
              emergency_contact_name: emergencyContactName,
              emergency_contact_phone: emergencyContactPhone,
              permanent_address: permanentAddress,
              current_address: currentAddress,
              
              // Employment Information
              employee_id: employeeId,
              department: department,
              designation: designation,
              date_of_joining: dateOfJoining,
              reporting_manager: reportingManager,
              work_location: workLocation,
              shift_timing: shiftTiming,
              
              // Compliance Information
              pan_number: panNumber,
              aadhar_number: aadharNumber,
              pf_number: pfNumber,
              esi_number: esiNumber,
              bank_account_number: bankAccountNumber,
              ifsc_code: ifscCode,
              
              profile_completed: true
            }
          ])

        if (profileError) {
          console.error('Error creating profile:', profileError)
          setError('Account created but profile setup failed. Please contact support.')
        } else {
          setSuccess('Registration successful! Please check your email to confirm your account.')
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
    
    setLoading(false)
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <input
                type="email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender *</label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
              <input
                type="tel"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Permanent Address *</label>
              <textarea
                required
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Address</label>
              <textarea
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={currentAddress}
                onChange={(e) => setCurrentAddress(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setCurrentAddress(permanentAddress)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-800"
              >
                Same as permanent address
              </button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Joining *</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Designation *</label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                >
                  <option value="">Select Designation</option>
                  {designations.map(desig => (
                    <option key={desig.value} value={desig.value}>{desig.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reporting Manager</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={reportingManager}
                  onChange={(e) => setReportingManager(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Work Location</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="e.g., Jharia, Dhanbad"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shift Timing</label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={shiftTiming}
                onChange={(e) => setShiftTiming(e.target.value)}
                placeholder="e.g., 6:00 AM - 2:00 PM"
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Compliance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">PAN Number *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Aadhar Number *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={aadharNumber}
                  onChange={(e) => setAadharNumber(e.target.value)}
                  placeholder="1234 5678 9012"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">PF Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={pfNumber}
                  onChange={(e) => setPfNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ESI Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={esiNumber}
                  onChange={(e) => setEsiNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Account Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 bg-primary-600 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2M7 21h2m-2 0H3m2-5h4m0 0V9a1 1 0 011-1h1a1 1 0 011 1v7m-4 0h4" />
                </svg>
              </div>
            </div>
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Central Coalfields Limited
            </h2>
            <p className="text-center text-sm text-gray-600">
              Employee Registration System
            </p>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Account</span>
                <span>Personal</span>
                <span>Contact</span>
                <span>Employment</span>
                <span>Compliance</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6">
              {renderStepContent()}
              
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                  {success}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComprehensiveRegister
