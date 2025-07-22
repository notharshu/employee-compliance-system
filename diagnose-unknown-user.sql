-- Diagnostic Query to Find "Unknown User" Issues
-- Run this in your Supabase SQL Editor

-- 1. Check total counts
SELECT 
    'Total Documents' as description,
    COUNT(*)::text as count
FROM documents
UNION ALL
SELECT 
    'Total Profiles' as description,
    COUNT(*)::text as count
FROM profiles;

-- 2. Check for orphaned documents (documents without matching profiles)
SELECT 
    'Orphaned Documents' as description,
    COUNT(*)::text as count
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id
WHERE p.id IS NULL AND d.employee_id IS NOT NULL;

-- 3. Check for documents with NULL employee_id
SELECT 
    'Documents with NULL employee_id' as description,
    COUNT(*)::text as count
FROM documents 
WHERE employee_id IS NULL;

-- 4. Show sample of problematic documents
SELECT 
    'SAMPLE PROBLEMATIC DOCUMENTS' as section,
    '' as spacer,
    '' as spacer2,
    '' as spacer3,
    '' as spacer4
UNION ALL
SELECT 
    d.id::text as document_id,
    d.title as document_title,
    COALESCE(d.employee_id::text, 'NULL') as employee_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'NO PROFILE FOUND') as employee_name,
    COALESCE(p.email, 'NO EMAIL') as employee_email
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id
WHERE p.id IS NULL
LIMIT 5;

-- 5. Show sample of working documents
SELECT 
    'SAMPLE WORKING DOCUMENTS' as section,
    '' as spacer,
    '' as spacer2,
    '' as spacer3,
    '' as spacer4
UNION ALL
SELECT 
    d.id::text as document_id,
    d.title as document_title,
    d.employee_id::text as employee_id,
    p.first_name || ' ' || p.last_name as employee_name,
    p.email as employee_email
FROM documents d
INNER JOIN profiles p ON d.employee_id = p.id
LIMIT 5;

-- 6. Check profile data completeness
SELECT 
    'Profiles missing first_name' as issue,
    COUNT(*)::text as count
FROM profiles 
WHERE first_name IS NULL OR first_name = ''
UNION ALL
SELECT 
    'Profiles missing last_name' as issue,
    COUNT(*)::text as count
FROM profiles 
WHERE last_name IS NULL OR last_name = ''
UNION ALL
SELECT 
    'Profiles missing email' as issue,
    COUNT(*)::text as count
FROM profiles 
WHERE email IS NULL OR email = '';

-- 7. Check if the exact query used by HR Dashboard works
SELECT 
    'HR Dashboard Query Test' as test,
    COUNT(*)::text as total_rows
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id;

-- 8. Show the exact data structure that HR Dashboard would see
SELECT 
    d.id,
    d.employee_id,
    d.title,
    d.category,
    d.status,
    d.created_at,
    -- Employee data (this is what shows as "Unknown User" if NULL)
    p.id as profile_id,
    p.first_name,
    p.last_name,
    p.email,
    p.designation,
    p.role,
    -- Status check
    CASE 
        WHEN p.id IS NULL AND d.employee_id IS NOT NULL THEN 'ORPHANED_DOCUMENT'
        WHEN p.id IS NULL AND d.employee_id IS NULL THEN 'NO_EMPLOYEE_ID_SET'
        WHEN p.first_name IS NULL OR p.last_name IS NULL THEN 'INCOMPLETE_PROFILE'
        ELSE 'OK'
    END as data_status
FROM documents d
LEFT JOIN profiles p ON d.employee_id = p.id
ORDER BY d.created_at DESC
LIMIT 10;
