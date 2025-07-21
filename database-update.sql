-- Add missing columns to documents table for Employee Compliance System
-- Run this in your Supabase SQL Editor

-- First, let's check what columns currently exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;

-- Add ALL potentially missing columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT, -- Changed from UUID to TEXT to match employee_id type
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraints that might be missing
ALTER TABLE documents ALTER COLUMN title SET NOT NULL;
ALTER TABLE documents ALTER COLUMN category SET NOT NULL;

-- Note: Skipping foreign key constraints due to data type mismatches
-- The employee_id column is TEXT but profiles.id is UUID
-- This needs to be resolved by converting employee_id to UUID type or profiles.id to TEXT
-- For now, we'll rely on application-level data integrity

-- If you want to fix the data types, uncomment and run ONE of these options:

-- OPTION 1: Convert employee_id from TEXT to UUID (if all existing values are valid UUIDs)
-- ALTER TABLE documents ALTER COLUMN employee_id TYPE UUID USING employee_id::UUID;
-- ALTER TABLE documents ALTER COLUMN reviewed_by TYPE UUID USING reviewed_by::UUID;
-- Then you can add the foreign key constraints

-- OPTION 2: Convert profiles.id from UUID to TEXT (NOT recommended as it affects auth)
-- This is not recommended as it may break Supabase authentication

-- For now, we'll add indexes to maintain performance without foreign keys
CREATE INDEX IF NOT EXISTS idx_documents_employee_id_lookup ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_reviewed_by_lookup ON documents(reviewed_by);

-- Add comments for clarity
COMMENT ON COLUMN documents.department IS 'Department of the employee who uploaded the document';
COMMENT ON COLUMN documents.expiry_date IS 'Expiration date for the document (null means no expiration)';
COMMENT ON COLUMN documents.description IS 'Optional description of the document';
COMMENT ON COLUMN documents.file_url IS 'URL/path to the uploaded file in storage';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Check if all columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;
