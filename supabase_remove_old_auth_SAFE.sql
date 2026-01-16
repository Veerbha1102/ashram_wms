-- ==========================================
-- SAFE OLD AUTH SYSTEM REMOVAL
-- ==========================================
-- This version handles existing data safely

-- Step 1: First, check what data we have
SELECT 
    'Total Profiles' as info,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
    'Profiles with Gmail',
    COUNT(*) 
FROM profiles WHERE gmail IS NOT NULL
UNION ALL
SELECT 
    'Profiles without Gmail',
    COUNT(*) 
FROM profiles WHERE gmail IS NULL
UNION ALL
SELECT 
    'Authorized Users',
    COUNT(*) 
FROM authorized_users;

-- Step 2: See which profiles don't have Gmail
SELECT 
    id,
    name,
    phone,
    role,
    'Missing Gmail' as status
FROM profiles 
WHERE gmail IS NULL
LIMIT 10;

-- Step 3: CHOOSE YOUR APPROACH
-- Uncomment ONE of the following options:

-- OPTION A: Delete old profiles without authorized_users entry (CLEAN START)
-- This removes all old worker data that isn't in the new system
/*
DELETE FROM attendance WHERE worker_id IN (
    SELECT id FROM profiles WHERE gmail IS NULL
);
DELETE FROM tasks WHERE assigned_to IN (
    SELECT id FROM profiles WHERE gmail IS NULL
);
DELETE FROM leaves WHERE worker_id IN (
    SELECT id FROM profiles WHERE gmail IS NULL
);
DELETE FROM profiles WHERE gmail IS NULL;
*/

-- OPTION B: Keep old profiles with placeholder emails (PRESERVE DATA)
-- This keeps old data but makes it accessible via email system
/*
UPDATE profiles
SET gmail = CONCAT('worker_', id, '@legacy.local'),
    is_active = false  -- Mark as inactive
WHERE gmail IS NULL;
*/

-- Step 4: Remove old auth columns
ALTER TABLE profiles DROP COLUMN IF EXISTS device_token;
ALTER TABLE profiles DROP COLUMN IF EXISTS pin;

-- Step 5: Verify cleanup
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('gmail', 'device_token', 'pin', 'role')
ORDER BY column_name;
