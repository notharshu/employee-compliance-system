-- Fix Data Type Mismatches for Employee Compliance System
-- Run this in your Supabase SQL Editor

-- First, let's check the current data types
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE (table_name = 'documents' AND column_name = 'employee_id') 
   OR (table_name = 'profiles' AND column_name = 'id')
ORDER BY table_name, column_name;

-- Check if there's any existing data in documents table
SELECT COUNT(*) as document_count FROM documents;

-- RECOMMENDED SOLUTION: Convert employee_id from TEXT to UUID
-- This makes it compatible with auth.uid() and profiles.id

-- Step 1: Drop existing RLS policies that depend on employee_id
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on documents table that might reference employee_id
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'All policies on documents table have been dropped';
END $$;

-- Step 2: Handle employee_id column data type conversion
DO $$
BEGIN
    -- Add the column if it doesn't exist (as TEXT first)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN employee_id TEXT;
        RAISE NOTICE 'Added employee_id column as TEXT';
    END IF;

    -- Check current data type and convert if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'employee_id' 
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'employee_id is currently TEXT type - will convert to UUID';
        
        -- Delete any rows with invalid UUID values in employee_id
        DELETE FROM documents WHERE employee_id IS NOT NULL AND employee_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
        
        -- Convert the column from TEXT to UUID
        ALTER TABLE documents ALTER COLUMN employee_id TYPE UUID USING employee_id::UUID;
        
        RAISE NOTICE 'Successfully converted employee_id from TEXT to UUID';
    ELSE
        RAISE NOTICE 'employee_id is already UUID type or does not exist';
    END IF;
END $$;

-- Step 2: Do the same for reviewed_by column
DO $$
BEGIN
    -- Add the column if it doesn't exist (as UUID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE documents ADD COLUMN reviewed_by UUID;
        RAISE NOTICE 'Added reviewed_by column as UUID';
    ELSE
        -- Convert to UUID if it's currently TEXT
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name = 'reviewed_by' 
            AND data_type = 'text'
        ) THEN
            -- Delete any rows with invalid UUID values in reviewed_by
            DELETE FROM documents WHERE reviewed_by IS NOT NULL AND reviewed_by !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
            
            -- Convert the column from TEXT to UUID
            ALTER TABLE documents ALTER COLUMN reviewed_by TYPE UUID USING CASE 
                WHEN reviewed_by ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
                THEN reviewed_by::UUID 
                ELSE NULL 
            END;
            
            RAISE NOTICE 'Successfully converted reviewed_by from TEXT to UUID';
        ELSE
            RAISE NOTICE 'reviewed_by is already UUID type';
        END IF;
    END IF;
END $$;

-- Step 3: Now add the foreign key constraints
DO $$
BEGIN
    -- Add foreign key for employee_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_employee_id_fkey' 
        AND table_name = 'documents'
    ) THEN
        ALTER TABLE documents ADD CONSTRAINT documents_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for employee_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for employee_id already exists';
    END IF;
    
    -- Add foreign key for reviewed_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_reviewed_by_fkey' 
        AND table_name = 'documents'
    ) THEN
        ALTER TABLE documents ADD CONSTRAINT documents_reviewed_by_fkey 
        FOREIGN KEY (reviewed_by) REFERENCES profiles(id);
        RAISE NOTICE 'Added foreign key constraint for reviewed_by';
    ELSE
        RAISE NOTICE 'Foreign key constraint for reviewed_by already exists';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding foreign key constraints: %. This is expected if data types still don''t match.', SQLERRM;
END $$;

-- Step 4: Recreate the RLS policies with correct data types
DO $$
BEGIN
    -- Recreate the insert policy
    BEGIN
        CREATE POLICY "Users can insert their documents" ON documents
        FOR INSERT 
        TO authenticated
        WITH CHECK (employee_id = auth.uid());
        RAISE NOTICE 'Created INSERT policy for documents';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'INSERT policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating INSERT policy: %', SQLERRM;
    END;
    
    -- Recreate the select policy
    BEGIN
        CREATE POLICY "Users can view their documents" ON documents
        FOR SELECT 
        TO authenticated
        USING (employee_id = auth.uid());
        RAISE NOTICE 'Created SELECT policy for documents';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'SELECT policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating SELECT policy: %', SQLERRM;
    END;
    
    -- Add update and delete policies as well
    BEGIN
        CREATE POLICY "Users can update their documents" ON documents
        FOR UPDATE 
        TO authenticated
        USING (employee_id = auth.uid())
        WITH CHECK (employee_id = auth.uid());
        RAISE NOTICE 'Created UPDATE policy for documents';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'UPDATE policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating UPDATE policy: %', SQLERRM;
    END;
    
    BEGIN
        CREATE POLICY "Users can delete their documents" ON documents
        FOR DELETE 
        TO authenticated
        USING (employee_id = auth.uid());
        RAISE NOTICE 'Created DELETE policy for documents';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'DELETE policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating DELETE policy: %', SQLERRM;
    END;
    
    -- HR policies
    BEGIN
        CREATE POLICY "HR can view all documents" ON documents
        FOR SELECT 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'hr'
            )
        );
        RAISE NOTICE 'Created HR SELECT policy for documents';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'HR SELECT policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating HR SELECT policy: %', SQLERRM;
    END;
    
    BEGIN
        CREATE POLICY "HR can update all documents" ON documents
        FOR UPDATE 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'hr'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'hr'
            )
        );
        RAISE NOTICE 'Created HR UPDATE policy for documents';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'HR UPDATE policy already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating HR UPDATE policy: %', SQLERRM;
    END;
END $$;

-- Verify the final data types
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE (table_name = 'documents' AND column_name IN ('employee_id', 'reviewed_by')) 
   OR (table_name = 'profiles' AND column_name = 'id')
ORDER BY table_name, column_name;

-- Check foreign key constraints
SELECT 
    constraint_name, 
    table_name, 
    column_name, 
    foreign_table_name, 
    foreign_column_name
FROM information_schema.key_column_usage 
WHERE table_name = 'documents' 
AND constraint_name LIKE '%_fkey';

-- Verify final policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'documents' 
ORDER BY policyname;
