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
      setError('')
      
      console.log('Fetching profile for user:', user?.id)

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Fetch profile using the authenticated user's ID - DO NOT query auth.users
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')  // Only query profiles table
        .select('*')
        .eq('id', user.id)  // Use the user ID from your auth context
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        
        if (profileError.code === 'PGRST116') {
          // No profile found
          throw new Error('Profile not found. Please contact HR or try logging out and back in.')
        } else {
          throw new Error(`Failed to load profile: ${profileError.message}`)
        }
      }

      if (!profileData) {
        throw new Error('No profile data returned')
      }

      console.log('Profile loaded successfully:', profileData)
      
      // Set profile data
      setProfile(profileData)
      
      // Set form data for editing
      setFormData({
        first_name: profileData.first_name || '',
        middle_name: profileData.middle_name || '',
        last_name: profileData.last_name || '',
        phone_number: profileData.phone_number || '',
        emergency_contact_name: profileData.emergency_contact_name || '',
        emergency_contact_phone: profileData.emergency_contact_phone || '',
        permanent_address: profileData.permanent_address || '',
        current_address: profileData.current_address || '',
        work_location: profileData.work_location || '',
        shift_timing: profileData.shift_timing || '',
        bank_account_number: profileData.bank_account_number || '',
        ifsc_code: profileData.ifsc_code || '',
        profile_picture_url: profileData.profile_picture_url || ''
      })

    } catch (error) {
      console.error('Error in fetchProfile:', error)
      setError(error.message || 'Failed to load profile')
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

      // Use user from auth context instead of getUser()
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/profile-picture.${fileExt}`

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
        .eq('id', user.id)

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
      // Use user from context instead of getUser()
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('profiles')  // Only update profiles table
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)  // Use user from auth context

      if (error) throw error

      setProfile({ ...profile, ...formData })
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      console.error('Error updating profile:', error)
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
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           (user?.email ? user.email.charAt(0).toUpperCase() : 'U')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="h-20 w-20 rounded-full border-4 border-white object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full border-4 border-white bg-gray-300 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-gray-600">
                        {getInitials()}
                      </span>
                    </div>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50"
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
                  )}
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">
                    {profile.first_name && profile.last_name 
                      ? `${profile.first_name} ${profile.middle_name || ''} ${profile.last_name}`.trim()
                      : 'User Profile'
                    }
                  </h1>
                  <p className="text-blue-100">{user?.email}</p>
                  <p className="text-blue-100 text-sm">
                    {profile.designation || 'Employee'} • {profile.department || 'Not assigned'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              {isEditing ? 'Update your personal information and account settings' : 'View your personal information and account settings'}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{profile.first_name || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Middle Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="middle_name"
                          value={formData.middle_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{profile.middle_name || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.last_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.phone_number || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Emergency Contact */}
                  <h4 className="text-md font-medium text-gray-900 border-b pb-1 mt-6">
                    Emergency Contact
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.emergency_contact_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.emergency_contact_phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                {/* Employment & Address Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Employment Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <p className="text-gray-900">{profile.department || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation
                      </label>
                      <p className="text-gray-900">{profile.designation || 'Not provided'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="work_location"
                        value={formData.work_location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.work_location || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Timing
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="shift_timing"
                        value={formData.shift_timing}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.shift_timing || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Address Information */}
                  <h4 className="text-md font-medium text-gray-900 border-b pb-1 mt-6">
                    Address Information
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Permanent Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="permanent_address"
                        value={formData.permanent_address}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.permanent_address || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="current_address"
                        value={formData.current_address}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.current_address || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Banking Information */}
                  <h4 className="text-md font-medium text-gray-900 border-b pb-1 mt-6">
                    Banking Information
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="bank_account_number"
                        value={formData.bank_account_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.bank_account_number || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IFSC Code
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.ifsc_code || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Password Settings
                  </h3>
                  {!showPasswordChange && (
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(true)}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordChange && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <form onSubmit={handleUpdatePassword}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            minLength="6"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            minLength="6"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-3 mt-4">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordChange(false)
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            })
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Hidden file input for profile picture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfilePictureUpload}
        className="hidden"
      />
    </div>
  )
}

export default Profile
