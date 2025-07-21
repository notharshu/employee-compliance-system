-- Storage Bucket and Policies Setup for Employee Compliance System
-- Run these commands in your Supabase SQL Editor

-- 1. Create storage bucket (if it doesn't exist)
-- Note: This might need to be done through the Supabase Dashboard Storage section instead
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
    'documents', 
    'documents', 
    false, 
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create storage policies for the documents bucket

-- Policy 1: Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow users to view their own documents
CREATE POLICY "Users can view their own documents" ON storage.objects
FOR SELECT 
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow users to update their own documents
CREATE POLICY "Users can update their own documents" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents" ON storage.objects
FOR DELETE 
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Allow HR users to view all documents
CREATE POLICY "HR can view all documents" ON storage.objects
FOR SELECT 
TO authenticated
USING (
    bucket_id = 'documents' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    )
);

-- Policy 6: Allow HR users to update all documents  
CREATE POLICY "HR can update all documents" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
    bucket_id = 'documents' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    )
)
WITH CHECK (
    bucket_id = 'documents' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
