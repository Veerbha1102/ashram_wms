-- ==========================================
-- COMPLETE OLD AUTH SYSTEM REMOVAL
-- ==========================================
-- This migration removes all traces of the old phone/PIN authentication

-- Step 1: Remove device_token column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS device_token;

-- Step 2: Remove pin column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS pin;

-- Step 3: Ensure profiles table has proper structure
-- Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 4: Handle existing profiles
-- Option A: Delete old profiles that don't have authorized_users entry (recommended for clean start)
-- Uncomment this if you want to remove old worker data:
-- DELETE FROM profiles 
-- WHERE gmail IS NULL 
-- AND id NOT IN (SELECT user_id FROM authorized_users WHERE user_id IS NOT NULL);

-- Option B: Set placeholder emails for old profiles (if you want to keep old data)
-- Uncomment this if you want to keep old profiles:
-- UPDATE profiles
-- SET gmail = CONCAT('legacy_', phone, '@placeholder.local')
-- WHERE gmail IS NULL AND phone IS NOT NULL;

-- Step 5: Update profiles to sync with authorized_users
-- This ensures all profiles linked to auth have email/auth-based data
UPDATE profiles p
SET 
    gmail = au.gmail,
    role = au.role,
    is_active = au.is_active
FROM authorized_users au
WHERE p.id = au.user_id
AND au.user_id IS NOT NULL;

-- Step 6: ONLY make gmail NOT NULL if all profiles have gmail
-- Check first:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE gmail IS NULL) THEN
        ALTER TABLE profiles ALTER COLUMN gmail SET NOT NULL;
        RAISE NOTICE 'Gmail column set to NOT NULL successfully';
    ELSE
        RAISE NOTICE 'Warning: Some profiles still have NULL gmail. Please handle them first.';
        RAISE NOTICE 'Run this query to see them: SELECT id, name, phone FROM profiles WHERE gmail IS NULL';
    END IF;
END $$;

-- Step 6: Verify cleanup
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check that old auth columns are gone
SELECT 
    COUNT(*) FILTER (WHERE column_name = 'device_token') as has_device_token,
    COUNT(*) FILTER (WHERE column_name = 'pin') as has_pin,
    COUNT(*) FILTER (WHERE column_name = 'gmail') as has_gmail
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Expected result: has_device_token = 0, has_pin = 0, has_gmail = 1
