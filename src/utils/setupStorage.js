import { supabase } from './supabase.js'

/**
 * Setup script to create necessary storage buckets for the application
 * This should be run once during initial setup
 */
export const setupStorageBuckets = async () => {
  try {
    console.log('Setting up storage buckets...')
    
    // Check if buckets exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return false
    }

    const documentsBucketExists = buckets.some(bucket => bucket.name === 'documents')
    const profilePicturesBucketExists = buckets.some(bucket => bucket.name === 'profile-pictures')

    // Create documents bucket if it doesn't exist
    if (!documentsBucketExists) {
      console.log('Creating documents bucket...')
      const { data: docBucket, error: docBucketError } = await supabase.storage.createBucket('documents', {
        public: false,
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ],
        fileSizeLimit: 10485760 // 10MB
      })

      if (docBucketError) {
        console.error('Error creating documents bucket:', docBucketError)
        return false
      } else {
        console.log('Documents bucket created successfully')
        
        // Create policies folder in documents bucket
        try {
          console.log('Creating policies folder...')
          const { error: folderError } = await supabase.storage
            .from('documents')
            .upload('policies/.keep', new Blob([''], { type: 'text/plain' }))
          
          if (folderError && !folderError.message.includes('already exists')) {
            console.warn('Could not create policies folder:', folderError)
          } else {
            console.log('Policies folder created successfully')
          }
        } catch (folderErr) {
          console.warn('Policies folder creation warning:', folderErr)
        }
      }
    } else {
      console.log('Documents bucket already exists')
      
      // Try to create policies folder even if bucket exists
      try {
        console.log('Ensuring policies folder exists...')
        const { error: folderError } = await supabase.storage
          .from('documents')
          .upload('policies/.keep', new Blob([''], { type: 'text/plain' }))
        
        if (folderError && !folderError.message.includes('already exists')) {
          console.warn('Could not create policies folder:', folderError)
        } else {
          console.log('Policies folder verified/created')
        }
      } catch (folderErr) {
        console.warn('Policies folder check warning:', folderErr)
      }
    }

    // Create profile-pictures bucket if it doesn't exist
    if (!profilePicturesBucketExists) {
      console.log('Creating profile-pictures bucket...')
      const { data: profileBucket, error: profileBucketError } = await supabase.storage.createBucket('profile-pictures', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (profileBucketError) {
        console.error('Error creating profile-pictures bucket:', profileBucketError)
        return false
      } else {
        console.log('Profile pictures bucket created successfully')
      }
    } else {
      console.log('Profile pictures bucket already exists')
    }

    console.log('Storage setup completed successfully!')
    return true
  } catch (error) {
    console.error('Error setting up storage:', error)
    return false
  }
}

/**
 * Test upload function to verify storage is working
 */
export const testStorageUpload = async () => {
  try {
    console.log('Testing storage upload...')
    
    // Create a simple test file
    const testContent = 'This is a test file for storage verification'
    const testBlob = new Blob([testContent], { type: 'text/plain' })
    const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' })

    // Try to upload to documents bucket
    const { data, error } = await supabase.storage
      .from('documents')
      .upload('test/test-file.txt', testFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Storage test failed:', error)
      return false
    } else {
      console.log('Storage test successful:', data)
      
      // Test policies folder upload
      const { data: policyData, error: policyError } = await supabase.storage
        .from('documents')
        .upload('policies/test-policy.txt', testFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (policyError) {
        console.warn('Policies folder test failed:', policyError)
      } else {
        console.log('Policies folder test successful:', policyData)
        // Clean up policy test file
        await supabase.storage
          .from('documents')
          .remove(['policies/test-policy.txt'])
      }
      
      // Clean up test file
      await supabase.storage
        .from('documents')
        .remove(['test/test-file.txt'])
      
      return true
    }
  } catch (error) {
    console.error('Error testing storage:', error)
    return false
  }
}

/**
 * Check database table structure for documents
 */
export const checkDatabaseSchema = async () => {
  try {
    console.log('Checking database schema...')
    
    // Test with the new documents table structure
    const testData = {
      filename: 'test.txt',
      file_path: 'test/test-file.txt',
      file_size: 100,
      file_type: 'text/plain',
      title: 'Test Document',
      description: 'Test description',
      document_type: 'policy',
      department: 'systems', // Must match your department constraint
      upload_department: 'systems',
      status: 'pending',
      uploaded_by: '00000000-0000-0000-0000-000000000000' // Test UUID
    }

    const { data, error } = await supabase
      .from('documents')
      .insert(testData)
      .select()

    if (error) {
      console.error('Database schema check - Error details:', error)
      
      // Check if table exists
      if (error.code === 'PGRST116') {
        console.error('Documents table does not exist!')
        return false
      }

      // Check for missing columns
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.error('Missing database columns detected!')
        console.error('Expected columns: filename, file_path, file_size, file_type, title, description, document_type, department, upload_department, status, uploaded_by')
        return false
      }

      // If it's a constraint violation (like foreign key for uploaded_by), that's expected
      if (error.code === '23505' || error.code === '23502' || error.code === '23503') {
        console.log('Database schema appears to be correct (constraint violation expected for test data)')
        return true
      }

      return false
    } else {
      console.log('Database schema check passed')
      
      // Clean up test record
      if (data && data[0]) {
        await supabase
          .from('documents')
          .delete()
          .eq('id', data[0].id)
      }
      
      return true
    }
  } catch (error) {
    console.error('Error checking database schema:', error)
    return false
  }
}

/**
 * Test company policies table
 */
export const checkPoliciesSchema = async () => {
  try {
    console.log('Checking company_policies table schema...')
    
    const testPolicyData = {
      title: 'Test Policy',
      description: 'Test policy description',
      category: 'compliance',
      file_url: 'policies/test-policy.pdf',
      file_name: 'test-policy.pdf',
      file_type: 'application/pdf',
      file_size: 1000,
      uploaded_by: '00000000-0000-0000-0000-000000000000' // Test UUID
    }

    const { data, error } = await supabase
      .from('company_policies')
      .insert(testPolicyData)
      .select()

    if (error) {
      console.error('Policies schema check - Error details:', error)
      
      if (error.code === 'PGRST116') {
        console.error('company_policies table does not exist!')
        return false
      }

      if (error.code === '23505' || error.code === '23502' || error.code === '23503') {
        console.log('Policies schema appears to be correct (constraint violation expected for test data)')
        return true
      }

      return false
    } else {
      console.log('Policies schema check passed')
      
      // Clean up test record
      if (data && data[0]) {
        await supabase
          .from('company_policies')
          .delete()
          .eq('id', data[0].id)
      }
      
      return true
    }
  } catch (error) {
    console.error('Error checking policies schema:', error)
    return false
  }
}
