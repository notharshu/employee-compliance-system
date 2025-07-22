import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState({})

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    permanent_address: '',
    current_address: '',
    work_location: '',
    shift_timing: '',
    bank_account_number: '',
    ifsc_code: '',
    profile_picture_url: ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
  try {
    setLoading(true)
    setError(null)

    // First, get the current authenticated user to ensure we have the right ID
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !currentUser) {
      throw new Error('Authentication session invalid. Please sign out and sign back in.')
    }

    console.log('Authenticated user ID:', currentUser.id)
    console.log('React user ID:', user?.id)
    console.log('User email:', currentUser.email)

    // Try to fetch profile using the authenticated user's ID
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)

    // If no profile found by ID, try by email as fallback
    if (!data || data.length === 0) {
      console.log('No profile found by ID, trying by email...')
      const { data: emailData, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', currentUser.email)
      
      data = emailData
      error = emailError
    }

    if (error) throw error

    // Handle different scenarios
    if (!data || data.length === 0) {
      throw new Error('Profile not found. Please contact HR to create your profile.')
    } else if (data.length > 1) {
      console.warn('Multiple profiles found, using the most recent one')
      const latestProfile = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      setProfile(latestProfile)
      setFormData({
        first_name: latestProfile.first_name || '',
        middle_name: latestProfile.middle_name || '',
        last_name: latestProfile.last_name || '',
        phone_number: latestProfile.phone_number || '',
        emergency_contact_name: latestProfile.emergency_contact_name || '',
        emergency_contact_phone: latestProfile.emergency_contact_phone || '',
        permanent_address: latestProfile.permanent_address || '',
        current_address: latestProfile.current_address || '',
        work_location: latestProfile.work_location || '',
        shift_timing: latestProfile.shift_timing || '',
        bank_account_number: latestProfile.bank_account_number || '',
        ifsc_code: latestProfile.ifsc_code || '',
        profile_picture_url: latestProfile.profile_picture_url || ''
      })
    } else {
      // Single profile found - normal case
      setProfile(data[0])
      setFormData({
        first_name: data[0].first_name || '',
        middle_name: data[0].middle_name || '',
        last_name: data[0].last_name || '',
        phone_number: data[0].phone_number || '',
        emergency_contact_name: data[0].emergency_contact_name || '',
        emergency_contact_phone: data[0].emergency_contact_phone || '',
        permanent_address: data[0].permanent_address || '',
        current_address: data[0].current_address || '',
        work_location: data[0].work_location || '',
        shift_timing: data[0].shift_timing || '',
        bank_account_number: data[0].bank_account_number || '',
        ifsc_code: data[0].ifsc_code || '',
        profile_picture_url: data[0].profile_picture_url || ''
      })
    }
  } catch (error) {
    console.error('Profile fetch error:', error)
    setError('Error loading profile: ' + error.message)
  } finally {
    setLoading(false)
  }
}

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    })
  }

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      setUploadingPicture(true)
      setError('')

      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError || !currentUser) {
        throw new Error('User not authenticated')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}/profile-picture.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: urlData.publicUrl })
        .eq('id', currentUser.id)

      if (updateError) {
        await supabase.storage.from('profile-pictures').remove([fileName])
        throw new Error(`Profile update failed: ${updateError.message}`)
      }

      setFormData({
        ...formData,
        profile_picture_url: urlData.publicUrl
      })
      setProfile({
        ...profile,
        profile_picture_url: urlData.publicUrl
      })

      setSuccess('Profile picture updated successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      console.error('Profile picture upload error:', error)
      setError('Error uploading profile picture: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id)

      if (error) throw error

      setProfile({...profile, ...formData})
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      setError('Error updating profile: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setFormData({
      first_name: profile.first_name || '',
      middle_name: profile.middle_name || '',
      last_name: profile.last_name || '',
      phone_number: profile.phone_number || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_phone: profile.emergency_contact_phone || '',
      permanent_address: profile.permanent_address || '',
      current_address: profile.current_address || '',
      work_location: profile.work_location || '',
      shift_timing: profile.shift_timing || '',
      bank_account_number: profile.bank_account_number || '',
      ifsc_code: profile.ifsc_code || '',
      profile_picture_url: profile.profile_picture_url || ''
    })
    setIsEditing(false)
    setShowPasswordChange(false)
    setError('')
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      setSaving(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setSuccess('Password updated successfully!')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordChange(false)
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      setError('Error updating password: ' + error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    const firstName = profile.first_name || ''
    const lastName = profile.last_name || ''
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || user.email.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
            <p className="text-gray-600">
              {isEditing ? 'Update your personal information and account settings' : 'View your personal information and account settings'}
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative">
            {formData.profile_picture_url ? (
              <img
                src={formData.profile_picture_url}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="h-24 w-24 bg-primary-100 rounded-full flex items-center justify-center border-4 border-gray-200">
                <span className="text-2xl font-semibold text-primary-700">
                  {getInitials()}
                </span>
              </div>
            )}
            {isEditing && (
              <div className="absolute -bottom-2 -right-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200 disabled:opacity-50"
                >
                  {uploadingPicture ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name}`
                : 'Complete Your Profile'
              }
            </h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="mt-2 flex space-x-4 text-sm text-gray-500">
              <span>Employee ID: {profile.employee_id || 'Not assigned'}</span>
              <span>•</span>
              <span className="capitalize">
                {profile.designation?.replace('_', ' ') || 'Employee'}
              </span>
            </div>
          </div>
        </div>

        {uploadingPicture && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-blue-700">Uploading profile picture...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permanent Address</label>
                <textarea
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Address</label>
                <textarea
                  name="current_address"
                  value={formData.current_address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                <input
                  type="text"
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift Timing</label>
                <input
                  type="text"
                  name="shift_timing"
                  value={formData.shift_timing}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
            >
              {saving && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                type="button"
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {showPasswordChange ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showPasswordChange && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                    <span>{saving ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
              
              <div>
                <label className="text-sm text-gray-500">First Name</label>
                <p className="text-gray-900 font-medium">{profile.first_name || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Middle Name</label>
                <p className="text-gray-900 font-medium">{profile.middle_name || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Last Name</label>
                <p className="text-gray-900 font-medium">{profile.last_name || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
              
              <div>
                <label className="text-sm text-gray-500">Phone Number</label>
                <p className="text-gray-900 font-medium">{profile.phone_number || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Emergency Contact Name</label>
                <p className="text-gray-900 font-medium">{profile.emergency_contact_name || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Emergency Contact Phone</label>
                <p className="text-gray-900 font-medium">{profile.emergency_contact_phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Work Information</h3>
              
              <div>
                <label className="text-sm text-gray-500">Work Location</label>
                <p className="text-gray-900 font-medium">{profile.work_location || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Shift Timing</label>
                <p className="text-gray-900 font-medium">{profile.shift_timing || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
              
              <div>
                <label className="text-sm text-gray-500">Permanent Address</label>
                <p className="text-gray-900 font-medium">{profile.permanent_address || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Current Address</label>
                <p className="text-gray-900 font-medium">{profile.current_address || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Bank Information</h3>
              
              <div>
                <label className="text-sm text-gray-500">Bank Account Number</label>
                <p className="text-gray-900 font-medium">{profile.bank_account_number || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">IFSC Code</label>
                <p className="text-gray-900 font-medium">{profile.ifsc_code || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
