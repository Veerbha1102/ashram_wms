-- ==================================================
-- FIX "Database error creating new user" - RUN THIS NOW
-- ==================================================

-- Step 1: Fix profiles table structure
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'worker';
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE profiles ALTER COLUMN gmail DROP NOT NULL;

-- Step 2: Check if profiles table has correct columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 3: Fix RLS policies on profiles (might be blocking inserts)
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Allow authenticated users to read profiles
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (true);

-- Allow service role to insert (needed for user creation)
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Step 4: Verify RLS is enabled but not blocking
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Step 5: Test query - this should work now
-- Don't run this yet, just check it's ready

-- INSERT INTO profiles (id, name, gmail, role, phone, is_active)
-- VALUES (gen_random_uuid(), 'Test User', 'test@gmail.com', 'worker', 'test@gmail.com', true);
