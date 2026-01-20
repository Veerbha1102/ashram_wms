-- ============================================================
-- FIX 500 ERRORS: INFINITE RECURSION IN RLS
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create a secure function to get the current user's role
-- This bypasses RLS recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_my_claim_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- 2. Fix Profiles Policy (Use function instead of direct select)
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;

CREATE POLICY "Users can see own profile" ON profiles
FOR SELECT
USING (
  auth.uid() = id
  OR
  get_my_claim_role() IN ('admin', 'manager', 'swamiji')
);

-- 3. Fix Authorized Users Policy (Use function)
DROP POLICY IF EXISTS "Users can read own data" ON authorized_users;

CREATE POLICY "Users can read own data" ON authorized_users
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  gmail = (auth.jwt() ->> 'email')
  OR
  get_my_claim_role() IN ('admin', 'manager')
);

-- 4. Fix Tasks Policy (Use function)
DROP POLICY IF EXISTS "Workers can view assigned tasks" ON tasks;

CREATE POLICY "Workers can view assigned tasks" ON tasks
FOR SELECT
USING (
  auth.uid() = assigned_to
  OR
  get_my_claim_role() IN ('admin', 'manager', 'swamiji')
);

SELECT 'Recursion Fixed' as status;
