-- ==========================================
-- CLEAN UP DUPLICATE RLS POLICIES
-- ==========================================
-- This removes old conflicting policies

-- Drop ALL old policies on profiles
DROP POLICY IF EXISTS "Allow all inserts on profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all updates on profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Create CLEAN role-based policies
-- Everyone can view profiles
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT
    USING (true);

-- Service role and admins can insert (for user creation)
CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT
    WITH CHECK (true);  -- Service role bypasses this anyway

-- Admin/Manager can update any, users can update their own
CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE
    USING (
        get_user_role() IN ('admin', 'manager')
        OR auth.uid() = id
    );

-- Only Admin can delete
CREATE POLICY "profiles_delete" ON profiles
    FOR DELETE
    USING (get_user_role() = 'admin');

-- Verify clean policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Should see exactly 4 policies: select, insert, update, delete
