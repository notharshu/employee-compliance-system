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
  
  // Profile data
  const [profile, setProfile] = useState({})
  
  // Form data
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
  
  // Password change
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setProfile(data)
      setFormData({
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        phone_number: data.phone_number || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        permanent_address: data.permanent_address || '',
        current_address: data.current_address || '',
        work_location: data.work_location || '',
        shift_timing: data.shift_timing || '',
        bank_account_number: data.bank_account_number || '',
        ifsc_code: data.ifsc_code || '',
        profile_picture_url: data.profile_picture_url || ''
      })
    } catch (error) {
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

    try {
      setUploadingPicture(true)
      setError('')

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `profiles/${user.id}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: urlData.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

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
      setError('Error uploading profile picture: ' + error.message)
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

      // Update local profile state
      setProfile({...profile, ...formData})
      
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Error updating profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset form data to original profile values
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
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordChange(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Error updating password: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Profile' : 'Profile Overview'}
            </h1>
            <p className="text-gray-600">
              {isEditing ? 'Update your personal information and account settings' : 'View your personal information and account settings'}
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Picture Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {formData.profile_picture_url ? (
                <img
                  className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md"
                  src={formData.profile_picture_url}
                  alt="Profile"
                />
              ) : (
                <div className="h-20 w-20 bg-primary-600 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                  <span className="text-2xl font-bold text-white">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full p-1 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={uploadingPicture}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">
                Employee ID: {profile.employee_id} | {profile.designation?.replace('_', ' ').toUpperCase()}
              </p>
              {isEditing && uploadingPicture && (
                <p className="text-sm text-blue-600 mt-1">Uploading profile picture...</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
            {success}
          </div>
        )}

        {/* Profile Content */}
        {isEditing ? (
          /* Edit Mode */
          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
              <textarea
                name="permanent_address"
                rows={3}
                value={formData.permanent_address}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Current Address</label>
              <textarea
                name="current_address"
                rows={3}
                value={formData.current_address}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Work Location</label>
                <input
                  type="text"
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shift Timing</label>
                <input
                  type="text"
                  name="shift_timing"
                  value={formData.shift_timing}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {showPasswordChange ? 'Cancel Password Change' : 'Change Password'}
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Password Change Form */}
            {showPasswordChange && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm New Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          /* Preview Mode */
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">First Name</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.first_name || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Middle Name</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.middle_name || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Name</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.last_name || 'Not provided'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.phone_number || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Emergency Contact Name</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.emergency_contact_name || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Emergency Contact Phone</h3>
              <p className="mt-1 text-sm text-gray-900">{profile.emergency_contact_phone || 'Not provided'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Permanent Address</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{profile.permanent_address || 'Not provided'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Current Address</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{profile.current_address || 'Not provided'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Work Location</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.work_location || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Shift Timing</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.shift_timing || 'Not provided'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Bank Account Number</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.bank_account_number || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">IFSC Code</h3>
                <p className="mt-1 text-sm text-gray-900">{profile.ifsc_code || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
