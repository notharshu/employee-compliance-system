import { supabase } from './supabase.js'

/**
 * Setup script to create necessary storage buckets for the application
 * This should be run once during initial setup
 */
export const setupStorageBuckets = async () => {
  try {
    console.log('Setting up storage buckets...')

    // Check if documents bucket exists
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
      }
    } else {
      console.log('Documents bucket already exists')
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
    
    // Try to insert a test record (will fail but show us the expected structure)
    const testData = {
      employee_id: 'test-id',
      title: 'test',
      category: 'test',
      department: 'test',
      file_name: 'test.txt',
      file_size: 100,
      mime_type: 'text/plain',
      status: 'pending'
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
        return false
      }
      
      // If it's just a constraint violation, that's actually good - means table structure is correct
      if (error.code === '23505' || error.code === '23502') {
        console.log('Database schema appears to be correct (constraint violation expected)')
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
