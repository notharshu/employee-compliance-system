import { setupStorageBuckets, testStorageUpload, checkDatabaseSchema } from './setupStorage.js'

const runSetup = async () => {
  console.log('🚀 Starting application setup...')
  
  // Setup storage buckets
  const storageSuccess = await setupStorageBuckets()
  if (!storageSuccess) {
    console.error('❌ Storage setup failed')
    return
  }
  
  // Test storage
  const storageTestSuccess = await testStorageUpload()
  if (!storageTestSuccess) {
    console.error('❌ Storage test failed')
    return
  }
  
  // Check database schema
  const schemaSuccess = await checkDatabaseSchema()
  if (!schemaSuccess) {
    console.error('❌ Database schema check failed')
    return
  }
  
  console.log('✅ Setup completed successfully!')
}

runSetup().catch(console.error)
