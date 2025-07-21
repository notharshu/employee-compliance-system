-- Storage Bucket and Policies Setup for Employee Compliance System
-- Run these commands in your Supabase SQL Editor

-- 1. Create storage bucket (if it doesn't exist)
-- Note: Creating buckets via SQL might not work in all Supabase versions
-- If this fails, create the bucket manually through the Supabase Dashboard:
-- Go to Storage → Create bucket → Name: 'documents' → Private → 10MB limit

-- Try to create bucket via SQL (may fail in some Supabase versions)
DO $$
BEGIN
    BEGIN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, created_at, updated_at)
        VALUES (
            'documents', 
            'documents', 
            false, 
            10485760, -- 10MB limit
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Storage bucket "documents" created successfully via SQL';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not create bucket via SQL: %. Please create manually through Dashboard', SQLERRM;
    END;
END $$;

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
-- Note: This assumes profiles.id is UUID type. If it's TEXT, change auth.uid() to auth.uid()::text
DO $$
BEGIN
    BEGIN
        -- Try with UUID comparison first
        EXECUTE '
        CREATE POLICY "HR can view all documents" ON storage.objects
        FOR SELECT 
        TO authenticated
        USING (
            bucket_id = ''documents'' 
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = ''hr''
            )
        )';
        RAISE NOTICE 'HR view policy created with UUID comparison';
    EXCEPTION
        WHEN OTHERS THEN
            -- If UUID fails, try with text comparison
            BEGIN
                EXECUTE '
                CREATE POLICY "HR can view all documents" ON storage.objects
                FOR SELECT 
                TO authenticated
                USING (
                    bucket_id = ''documents'' 
                    AND EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE id::text = auth.uid()::text 
                        AND role = ''hr''
                    )
                )';
                RAISE NOTICE 'HR view policy created with TEXT comparison';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Could not create HR view policy: %', SQLERRM;
            END;
    END;
END $$;

-- Policy 6: Allow HR users to update all documents  
DO $$
BEGIN
    BEGIN
        -- Try with UUID comparison first
        EXECUTE '
        CREATE POLICY "HR can update all documents" ON storage.objects
        FOR UPDATE 
        TO authenticated
        USING (
            bucket_id = ''documents'' 
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = ''hr''
            )
        )
        WITH CHECK (
            bucket_id = ''documents'' 
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = ''hr''
            )
        )';
        RAISE NOTICE 'HR update policy created with UUID comparison';
    EXCEPTION
        WHEN OTHERS THEN
            -- If UUID fails, try with text comparison
            BEGIN
                EXECUTE '
                CREATE POLICY "HR can update all documents" ON storage.objects
                FOR UPDATE 
                TO authenticated
                USING (
                    bucket_id = ''documents'' 
                    AND EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE id::text = auth.uid()::text 
                        AND role = ''hr''
                    )
                )
                WITH CHECK (
                    bucket_id = ''documents'' 
                    AND EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE id::text = auth.uid()::text 
                        AND role = ''hr''
                    )
                )';
                RAISE NOTICE 'HR update policy created with TEXT comparison';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Could not create HR update policy: %', SQLERRM;
            END;
    END;
END $$;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
