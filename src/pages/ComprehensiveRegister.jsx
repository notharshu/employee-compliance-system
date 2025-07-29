import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

const ComprehensiveRegister = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Step 1: Account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2: Personal
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')

  // Step 3: Contact
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [currentAddress, setCurrentAddress] = useState('')

  // Step 4: Employment
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [dateOfJoining, setDateOfJoining] = useState('')
  const [reportingManager, setReportingManager] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [shiftTiming, setShiftTiming] = useState('')

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

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        return email.trim() && password && confirmPassword && password === confirmPassword
      case 2:
        return firstName.trim() && lastName.trim() && dateOfBirth && gender
      case 3:
        return phoneNumber.trim() && permanentAddress.trim()
      case 4:
        return department && designation && dateOfJoining
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setError('')
      setStep(step + 1)
    } else {
      setError('Please fill in all required fields to continue.')
    }
  }

  const prevStep = () => {
    setError('')
    setStep(step - 1)
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
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // 1) Sign up user
      const { data: signUpData, error: signUpError } = await signUp(email.trim(), password)
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      if (!signUpData?.user) throw new Error('User creation failed')

      const userId = signUpData.user.id

      // 2) Insert profile fully client-side
      const profileData = {
        id: userId,
        email: email.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth || null,
        gender,
        blood_group: bloodGroup || null,
        phone_number: phoneNumber.trim() || null,
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
        permanent_address: permanentAddress.trim(),
        current_address: currentAddress.trim() || null,
        department,
        designation,
        date_of_joining: dateOfJoining || null,
        reporting_manager: reportingManager.trim() || null,
        work_location: workLocation.trim() || null,
        shift_timing: shiftTiming.trim() || null,
        profile_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Retry insertion
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
        setSuccess('Registration successful! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      setError(`Registration failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
            <input 
              type="email" required placeholder="Email" value={email} 
              onChange={e => setEmail(e.target.value)} className="input" />
            <input 
              type="password" required minLength={6} placeholder="Password" value={password} 
              onChange={e => setPassword(e.target.value)} className="input" />
            <input 
              type="password" required minLength={6} placeholder="Confirm Password" value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} className="input" />
          </>
        )
      case 2:
        return (
          <>
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <input type="text" required placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="input" />
            <input type="text" placeholder="Middle Name" value={middleName} onChange={e => setMiddleName(e.target.value)} className="input" />
            <input type="text" required placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="input" />
            <input type="date" required value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="input" />
            <select required value={gender} onChange={e => setGender(e.target.value)} className="input">
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="input">
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
          </>
        )
      case 3:
        return (
          <>
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <input type="tel" required placeholder="Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="input" />
            <input type="text" placeholder="Emergency Contact Name" value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} className="input" />
            <input type="tel" placeholder="Emergency Contact Phone" value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} className="input" />
            <textarea required placeholder="Permanent Address" value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} className="textarea"></textarea>
            <textarea placeholder="Current Address (if different)" value={currentAddress} onChange={e => setCurrentAddress(e.target.value)} className="textarea"></textarea>
          </>
        )
      case 4:
        return (
          <>
            <h2 className="text-lg font-semibold mb-4">Employment Information</h2>
            <select required value={department} onChange={e => setDepartment(e.target.value)} className="input">
              <option value="">Select Department</option>
              {departments.map(({value,label}) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select required value={designation} onChange={e => setDesignation(e.target.value)} className="input">
              <option value="">Select Designation</option>
              {designations.map(({value,label}) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input type="date" required value={dateOfJoining} onChange={e => setDateOfJoining(e.target.value)} className="input" />
            <input type="text" placeholder="Reporting Manager" value={reportingManager} onChange={e => setReportingManager(e.target.value)} className="input" />
            <input type="text" placeholder="Work Location" value={workLocation} onChange={e => setWorkLocation(e.target.value)} className="input" />
            <input type="text" placeholder="Shift Timing" value={shiftTiming} onChange={e => setShiftTiming(e.target.value)} className="input" />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded shadow">
        <h2 className="text-3xl font-bold text-center">Comprehensive Registration</h2>
        <form onSubmit={step === 4 ? handleSubmit : (e) => {e.preventDefault(); nextStep();}} noValidate>
          {renderStepContent()}
          <div className="flex justify-between mt-6">
            {step > 1 && (
              <button type="button" onClick={prevStep} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                Previous
              </button>
            )}
            {step < 4 && (
              <button type="button" onClick={nextStep} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Next
              </button>
            )}
            {step === 4 && (
              <button type="submit" disabled={loading} className="ml-auto px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Completing Registration...' : 'Complete Registration'}
              </button>
            )}
          </div>

          {error && <p className="text-red-600 text-center mt-4">{error}</p>}
          {success && <p className="text-green-600 text-center mt-4">{success}</p>}

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default ComprehensiveRegister
