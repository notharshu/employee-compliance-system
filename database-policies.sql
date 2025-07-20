-- Row Level Security Policies for Employee Compliance System
-- Run these commands in your Supabase SQL Editor

-- 1. Enable Row Level Security on the documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 2. Enable Row Level Security on the profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy for employees to access their own documents
CREATE POLICY "employees_own_documents" ON documents
    FOR ALL USING (
        auth.uid()::text = employee_id::text
    );

-- 4. Policy for HR to view all documents
CREATE POLICY "hr_view_all_documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id::text = auth.uid()::text 
            AND profiles.role = 'hr'
        )
    );

-- 5. Policy for HR to update document status
CREATE POLICY "hr_update_document_status" ON documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id::text = auth.uid()::text 
            AND profiles.role = 'hr'
        )
    );

-- 6. Policy for HR to insert documents (if needed)
CREATE POLICY "hr_insert_documents" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id::text = auth.uid()::text 
            AND profiles.role = 'hr'
        )
    );

-- 7. Policy for employees to insert their own documents
CREATE POLICY "employees_insert_own_documents" ON documents
    FOR INSERT WITH CHECK (
        auth.uid()::text = employee_id::text
    );

-- 8. Profiles table policies - users can read their own profile
CREATE POLICY "users_own_profile_select" ON profiles
    FOR SELECT USING (
        auth.uid()::text = id::text
    );

-- 9. HR can read all profiles
CREATE POLICY "hr_read_all_profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id::text = auth.uid()::text 
            AND p.role = 'hr'
        )
    );

-- 10. Users can update their own profile (except role)
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE USING (
        auth.uid()::text = id::text
    );

-- Optional: If you want to prevent employees from changing their own role
-- You might want to create a separate policy or handle this in your application logic
