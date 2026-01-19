-- ============================================================
-- FIX RLS POLICIES (Login & Notifications)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. FIX: authorized_users 406 Error
-- Allow users to read their own row via Email matching (critical for first login)
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON authorized_users;

CREATE POLICY "Users can read own data" ON authorized_users
FOR SELECT
USING (
  -- Allow if user_id matches
  auth.uid() = user_id 
  OR 
  -- OR if email matches the JWT email (for initial link)
  gmail = (auth.jwt() ->> 'email')
  OR
  -- OR allow admins/managers to read all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow users to link their own user_id on first login
DROP POLICY IF EXISTS "Users can update own user_id" ON authorized_users;

CREATE POLICY "Users can update own user_id" ON authorized_users
FOR UPDATE
USING (
  gmail = (auth.jwt() ->> 'email')
);

-- 2. FIX: Notifications 400/406 Error
-- Ensure authenticated users can read their notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;

CREATE POLICY "Users can read own notifications" ON notifications
FOR SELECT
USING (
  auth.uid() = user_id
);

-- 3. FIX: Profiles RLS (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;

CREATE POLICY "Users can see own profile" ON profiles
FOR SELECT
USING (
  auth.uid() = id
  OR
  -- Allow admins/managers/swamiji to see all profiles
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'manager', 'swamiji')
  )
);

-- 4. FIX: Tasks RLS (Worker Access)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers can view assigned tasks" ON tasks;

CREATE POLICY "Workers can view assigned tasks" ON tasks
FOR SELECT
USING (
  auth.uid() = assigned_to
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager', 'swamiji')
  )
);

SELECT 'RLS Policies Updated' as status;
