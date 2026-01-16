-- Fix profiles table to have proper defaults and constraints
-- Run this to fix the "Database error creating new user" issue

-- Step 1: Make sure role column has a default
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'worker';

-- Step 2: Make sure gmail can be null initially (will be set by trigger)
ALTER TABLE profiles ALTER COLUMN gmail DROP NOT NULL;

-- Step 3: Make sure is_active has default
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;

-- Step 4: Verify the structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('id', 'gmail', 'name', 'role', 'phone', 'is_active')
ORDER BY ordinal_position;

-- Expected result:
-- gmail: nullable (will be synced from authorized_users)
-- role: DEFAULT 'worker', not null
-- is_active: DEFAULT true, not null
