-- Add missing columns to documents table for Employee Compliance System
-- Run this in your Supabase SQL Editor

-- Add missing department and expiry_date columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add a comment for clarity
COMMENT ON COLUMN documents.department IS 'Department of the employee who uploaded the document';
COMMENT ON COLUMN documents.expiry_date IS 'Expiration date for the document (null means no expiration)';

-- Optional: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);

-- Check if the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('department', 'expiry_date');
