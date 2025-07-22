-- Fix HR Dashboard Employee Data Fetching Issue
-- Run this in your Supabase SQL Editor to fix the "Unknown User" problem

-- Step 1: Check current data structure
SELECT 
    'documents' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'documents' 
    AND column_name IN ('id', 'employee_id')
UNION ALL
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND column_name IN ('id', 'first_name', 'last_name', 'email')
ORDER BY table_name, column_name;

-- Step 2: Check if there are any documents and profiles
SELECT 'documents_count' as metric, COUNT(*)::text as count FROM documents
UNION ALL
SELECT 'profiles_count' as metric, COUNT(*)::text as count FROM profiles;

-- Step 3: Check data type compatibility
DO $$
DECLARE
    doc_employee_id_type text;
    profiles_id_type text;
BEGIN
    -- Get employee_id data type from documents table
    SELECT data_type INTO doc_employee_id_type
    FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'employee_id';
    
    -- Get id data type from profiles table
    SELECT data_type INTO profiles_id_type
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id';
    
    RAISE NOTICE 'documents.employee_id type: %', COALESCE(doc_employee_id_type, 'MISSING');
    RAISE NOTICE 'profiles.id type: %', COALESCE(profiles_id_type, 'MISSING');
    
    IF doc_employee_id_type IS NULL THEN
        RAISE NOTICE 'ERROR: employee_id column is missing from documents table!';
    END IF;
    
    IF profiles_id_type IS NULL THEN
        RAISE NOTICE 'ERROR: id column is missing from profiles table!';
    END IF;
    
    IF doc_employee_id_type != profiles_id_type THEN
        RAISE NOTICE 'WARNING: Data type mismatch! This will prevent foreign key relationships.';
    ELSE
        RAISE NOTICE 'SUCCESS: Data types match between documents.employee_id and profiles.id';
    END IF;
END $$;

-- Step 4: Fix data type mismatch if needed
DO $$
DECLARE
    doc_employee_id_type text;
    profiles_id_type text;
BEGIN
    -- Get current data types
    SELECT data_type INTO doc_employee_id_type
    FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'employee_id';
    
    SELECT data_type INTO profiles_id_type
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id';
    
    -- If documents.employee_id is TEXT but profiles.id is UUID, convert employee_id to UUID
    IF doc_employee_id_type = 'text' AND profiles_id_type = 'uuid' THEN
        RAISE NOTICE 'Converting documents.employee_id from TEXT to UUID...';
        
        -- First, remove any invalid UUID values
        DELETE FROM documents 
        WHERE employee_id IS NOT NULL 
            AND employee_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
        
        -- Convert the column type
        ALTER TABLE documents 
        ALTER COLUMN employee_id TYPE UUID 
        USING CASE 
            WHEN employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
            THEN employee_id::UUID 
            ELSE NULL 
        END;
        
        RAISE NOTICE 'Successfully converted documents.employee_id to UUID type';
    
    -- If profiles.id is TEXT but we expect UUID, this is unusual for Supabase
    ELSIF profiles_id_type = 'text' AND doc_employee_id_type = 'uuid' THEN
        RAISE NOTICE 'WARNING: profiles.id is TEXT but documents.employee_id is UUID. This is unusual.';
        RAISE NOTICE 'Consider converting documents.employee_id to TEXT instead.';
    
    -- If both are TEXT, that might work but is not recommended
    ELSIF doc_employee_id_type = 'text' AND profiles_id_type = 'text' THEN
        RAISE NOTICE 'Both columns are TEXT. This should work but UUID is recommended for Supabase.';
    
    ELSE
        RAISE NOTICE 'Data types are compatible: % and %', doc_employee_id_type, profiles_id_type;
    END IF;
END $$;

-- Step 5: Ensure employee_id column exists and has proper constraints
DO $$
BEGIN
    -- Add employee_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN employee_id UUID;
        RAISE NOTICE 'Added employee_id column to documents table';
    END IF;
END $$;

-- Step 6: Create or recreate the foreign key constraint
DO $$
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_employee_id_fkey' 
            AND table_name = 'documents'
    ) THEN
        ALTER TABLE documents DROP CONSTRAINT documents_employee_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint';
    END IF;
    
    -- Create the foreign key constraint
    BEGIN
        ALTER TABLE documents 
        ADD CONSTRAINT documents_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Successfully created foreign key constraint documents_employee_id_fkey';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create foreign key constraint: %', SQLERRM;
            RAISE NOTICE 'This usually means there are data inconsistencies. Check the data manually.';
    END;
END $$;

-- Step 7: Check and fix RLS policies for HR access
DO $$
BEGIN
    -- Ensure HR can view all documents with joined profiles
    BEGIN
        CREATE POLICY "HR can view all documents with profiles" ON documents
        FOR SELECT 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'hr'
            )
        );
        RAISE NOTICE 'Created HR policy for viewing documents with profiles';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'HR policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating HR policy: %', SQLERRM;
    END;
END $$;

-- Step 8: Test the join query that the frontend uses
DO $$
DECLARE
    test_count integer;
BEGIN
    -- Test the exact query pattern used by the frontend
    SELECT COUNT(*) INTO test_count
    FROM documents d
    LEFT JOIN profiles p ON d.employee_id = p.id;
    
    RAISE NOTICE 'Test join query returned % rows', test_count;
    
    -- Check if any documents have missing profile data
    SELECT COUNT(*) INTO test_count
    FROM documents d
    LEFT JOIN profiles p ON d.employee_id = p.id
    WHERE p.id IS NULL AND d.employee_id IS NOT NULL;
    
    IF test_count > 0 THEN
        RAISE NOTICE 'WARNING: % documents have employee_id values that don''t match any profile', test_count;
        RAISE NOTICE 'These will show as "Unknown User" in the HR Dashboard';
    ELSE
        RAISE NOTICE 'SUCCESS: All documents with employee_id have matching profiles';
    END IF;
END $$;

-- Step 9: Show sample data to verify the fix
SELECT 
    d.id as document_id,
    d.title,
    d.employee_id,
    p.first_name,
    p.last_name,
    p.email,
    CASE 
        WHEN p.id IS NULL AND d.employee_id IS NOT NULL THEN 'ORPHANED_DOCUMENT'
        WHEN p.id IS NULL AND d.employee_id IS NULL THEN 'NO_EMPLOYEE_ID'
        ELSE 'OK'
    END as status
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id
LIMIT 10;

-- Step 10: Final verification
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'documents'
    AND kcu.column_name = 'employee_id';

RAISE NOTICE 'Fix script completed. Check the output above for any issues.';
RAISE NOTICE 'If you still see "Unknown User", the issue might be:';
RAISE NOTICE '1. Documents have employee_id values that don''t match any profiles';
RAISE NOTICE '2. RLS policies are preventing access to profile data';
RAISE NOTICE '3. The frontend code needs to be updated to handle the new structure';
