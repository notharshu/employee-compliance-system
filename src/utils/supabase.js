import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rrgtqshjqxypfnueskof.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZ3Rxc2hqcXh5cGZudWVza29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NjAwMDgsImV4cCI6MjA2OTMzNjAwOH0.UdinU3PaAg6dqzpLbBBubvwsvPLuvZAOAkpuDFbrLIM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Document categories
export const DOCUMENT_CATEGORIES = [
  'Medical',
  'Contract',
  'Training',
  'Safety',
  'HR',
  'Insurance',
  'Background Check',
  'Other'
]

// Company policy categories
export const POLICY_CATEGORIES = [
  'compliance',
  'hr',
  'safety',
  'finance',
  'operations',
  'legal',
  'benefits',
  'training'
]

// Document status options
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

// Department options (matching your database constraints)
export const DEPARTMENTS = [
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

// Designation options (matching your database constraints)
export const DESIGNATIONS = [
  { value: 'general_manager', label: 'General Manager' },
  { value: 'manager', label: 'Manager' },
  { value: 'assistant_manager', label: 'Assistant Manager' },
  { value: 'deputy_manager', label: 'Deputy Manager' },
  { value: 'management_trainee', label: 'Management Trainee' },
  { value: 'officer', label: 'Officer' },
  { value: 'sr_officer', label: 'Sr. Officer' }
]

// Storage bucket configurations
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'documents',
  PROFILE_PICTURES: 'profile-pictures'
}

// Storage folder paths
export const STORAGE_PATHS = {
  POLICIES: 'policies/',
  USER_UPLOADS: 'user-uploads/',
  PROFILE_PICTURES: 'profile-pictures/'
}

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  DOCUMENTS: 10485760, // 10MB
  PROFILE_PICTURES: 5242880, // 5MB
  POLICIES: 10485760 // 10MB
}

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  PROFILE_PICTURES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  POLICIES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
}

// Helper function to get department label by value
export const getDepartmentLabel = (value) => {
  const dept = DEPARTMENTS.find(d => d.value === value)
  return dept ? dept.label : value
}

// Helper function to get designation label by value
export const getDesignationLabel = (value) => {
  const desig = DESIGNATIONS.find(d => d.value === value)
  return desig ? desig.label : value
}

// Helper function to validate file type
export const validateFileType = (file, category = 'DOCUMENTS') => {
  const allowedTypes = ALLOWED_FILE_TYPES[category]
  return allowedTypes.includes(file.type)
}

// Helper function to validate file size
export const validateFileSize = (file, category = 'DOCUMENTS') => {
  const sizeLimit = FILE_SIZE_LIMITS[category]
  return file.size <= sizeLimit
}

// Helper function to generate file path
export const generateFilePath = (category, fileName, userId = null) => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2)
  
  switch (category) {
    case 'POLICIES':
      return `${STORAGE_PATHS.POLICIES}${timestamp}-${randomId}-${fileName}`
    case 'PROFILE_PICTURES':
      return `${userId}/${timestamp}-profile-picture.${fileName.split('.').pop()}`
    case 'DOCUMENTS':
    default:
      return `${STORAGE_PATHS.USER_UPLOADS}${timestamp}-${randomId}-${fileName}`
  }
}
