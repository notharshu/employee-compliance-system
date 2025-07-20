import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xcidbmpjtwznnhotvlwe.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaWRibXBqdHd6bm5ob3R2bHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjc4ODAsImV4cCI6MjA2ODYwMzg4MH0.2i7rTRfwT1E6tA_jVoRvZKPccO_0ntryt8grx4ORyE0'

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

// User roles
export const USER_ROLES = {
  EMPLOYEE: 'employee',
  HR: 'hr'
}
