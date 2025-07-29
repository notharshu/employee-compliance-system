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
