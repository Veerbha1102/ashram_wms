-- ==========================================
-- SYNC AUTHORIZED_USERS WITH PROFILES TABLE
-- ==========================================
-- This migration links authorized_users with profiles and keeps them in sync

-- Step 1: Add user_id reference to authorized_users
ALTER TABLE authorized_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_authorized_users_user_id ON authorized_users(user_id);

-- Step 3: Fix RLS policies with proper WITH CHECK clauses
DROP POLICY IF EXISTS "authorized_users_insert" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_update" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_delete" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_select" ON authorized_users;

-- Allow anyone to view authorized users (for login checks)
CREATE POLICY "authorized_users_select" ON authorized_users
    FOR SELECT
    USING (true);

-- Only admins can insert new authorized users
CREATE POLICY "authorized_users_insert" ON authorized_users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND au.role = 'admin'
            AND au.is_active = true
        )
    );

-- Only admins can update authorized users
CREATE POLICY "authorized_users_update" ON authorized_users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND au.role = 'admin'
            AND au.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND au.role = 'admin'
            AND au.is_active = true
        )
    );

-- Only admins can delete authorized users
CREATE POLICY "authorized_users_delete" ON authorized_users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND au.role = 'admin'
            AND au.is_active = true
        )
    );

-- ==========================================
-- AUTO-SYNC TRIGGER: authorized_users → profiles
-- ==========================================

-- Function to create/update profile when authorized_user is added/updated
CREATE OR REPLACE FUNCTION sync_authorized_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update profile
    INSERT INTO profiles (id, gmail, name, role, phone, is_active)
    VALUES (
        NEW.user_id,
        NEW.gmail,
        NEW.full_name,
        NEW.role,
        NEW.gmail, -- Use gmail as phone for now
        NEW.is_active
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        gmail = EXCLUDED.gmail,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger when authorized_user is inserted or updated
DROP TRIGGER IF EXISTS sync_to_profile_on_auth_user_change ON authorized_users;
CREATE TRIGGER sync_to_profile_on_auth_user_change
    AFTER INSERT OR UPDATE ON authorized_users
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION sync_authorized_user_to_profile();

-- ==========================================
-- Function to link auth user when they first log in
-- ==========================================
CREATE OR REPLACE FUNCTION link_auth_user_to_authorized()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user signs in via Supabase Auth, link them to authorized_users
    UPDATE authorized_users
    SET user_id = NEW.id,
        last_login = NOW()
    WHERE gmail = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table (when user logs in)
DROP TRIGGER IF EXISTS link_user_on_login ON auth.users;
CREATE TRIGGER link_user_on_login
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION link_auth_user_to_authorized();

-- ==========================================
-- MIGRATION: Link existing authorized_users to auth.users
-- ==========================================

-- Update authorized_users with existing auth.users by email
UPDATE authorized_users au
SET user_id = u.id
FROM auth.users u
WHERE au.gmail = u.email
AND au.user_id IS NULL;

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check the updated policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'authorized_users'
ORDER BY cmd, policyname;

-- Check if users are linked
SELECT 
    au.gmail,
    au.full_name,
    au.role,
    au.user_id,
    au.is_active,
    p.id as profile_id,
    p.name as profile_name
FROM authorized_users au
LEFT JOIN profiles p ON au.user_id = p.id
ORDER BY au.created_at DESC
LIMIT 10;
