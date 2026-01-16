-- ==========================================
-- DEBUG USER CREATION ERROR
-- ==========================================
-- Run this to diagnose the exact issue

-- Step 1: Check if service role can bypass RLS
-- The service role should be able to insert despite RLS
SELECT current_setting('role');

-- Step 2: Test profile insert directly
-- This should work if everything is configured correctly
DO $$
DECLARE
    test_id uuid := gen_random_uuid();
BEGIN
    -- Try to insert a test profile
    INSERT INTO profiles (id, name, gmail, role, phone, is_active)
    VALUES (
        test_id,
        'Test User',
        'test' || test_id::text || '@gmail.com',
        'worker',
        'test@gmail.com',
        true
    );
    
    -- If successful, delete it
    DELETE FROM profiles WHERE id = test_id;
    
    RAISE NOTICE 'Profile insert test PASSED';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Profile insert test FAILED: %', SQLERRM;
        ROLLBACK;
END $$;

-- Step 3: Check profiles table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 4: Check for any constraints that might fail
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 't' THEN 'TRIGGER'
    END AS constraint_type_desc,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profiles';

-- Step 5: Check RLS policies on profiles
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Step 6: Temporarily disable RLS on profiles for testing
-- Uncomment this ONLY for testing:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Then try adding a user in the UI
-- If it works, the issue is RLS policies

-- Remember to re-enable:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
