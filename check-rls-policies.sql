-- Check RLS Policies that might be blocking HR Dashboard
-- Run this in your Supabase SQL Editor

-- 1. Check if RLS is enabled on relevant tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('documents', 'profiles')
ORDER BY tablename;

-- 2. Show all policies on documents table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;

-- 3. Show all policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Test if the current user can see profiles (simulate what HR Dashboard does)
-- This will show if RLS is blocking profile access
SELECT 
    'Profile Access Test' as test_name,
    COUNT(*) as visible_profiles
FROM profiles;

-- 5. Test the exact query that HRDashboard.jsx uses
-- This simulates the Supabase query with the foreign key join
SELECT 
    'HR Dashboard Query Simulation' as test_name,
    COUNT(*) as total_documents,
    COUNT(p.id) as documents_with_profiles
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id;

-- 6. Check if there are any specific role-based restrictions
-- Show what the current authenticated user's role is
SELECT 
    'Current User Check' as test_name,
    auth.uid() as current_user_id,
    p.role as user_role,
    p.first_name || ' ' || p.last_name as user_name
FROM profiles p
WHERE p.id = auth.uid();

-- 7. Test if HR role can access all profiles
-- This checks if HR users can see other employees' profiles
SELECT 
    'HR Role Profile Access' as test_name,
    EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    ) as is_current_user_hr,
    COUNT(*) as accessible_profiles
FROM profiles p
WHERE EXISTS(
    SELECT 1 FROM profiles hr 
    WHERE hr.id = auth.uid() 
    AND hr.role = 'hr'
);

-- 8. Show the specific foreign key join that's failing
-- This is exactly what the frontend query does
SELECT 
    d.id,
    d.title,
    d.employee_id,
    -- This is what should show employee info but might be NULL due to RLS
    p.first_name,
    p.last_name,
    p.email
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id
LIMIT 3;
