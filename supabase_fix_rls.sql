-- FIX ALL RLS POLICIES - Run this in Supabase SQL Editor
-- This will allow all operations on all tables

-- ==========================================
-- DISABLE RLS ON ALL TABLES (for development simplicity)
-- ==========================================

-- Profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Attendance 
ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;

-- Tasks
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;

-- Leaves
ALTER TABLE IF EXISTS leaves DISABLE ROW LEVEL SECURITY;

-- Settings
ALTER TABLE IF EXISTS settings DISABLE ROW LEVEL SECURITY;

-- Activity Log
ALTER TABLE IF EXISTS activity_log DISABLE ROW LEVEL SECURITY;

-- Holidays
ALTER TABLE IF EXISTS holidays DISABLE ROW LEVEL SECURITY;

-- Worker Holidays
ALTER TABLE IF EXISTS worker_holidays DISABLE ROW LEVEL SECURITY;

-- Holiday Settings
ALTER TABLE IF EXISTS holiday_settings DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- OR, IF YOU WANT RLS WITH PUBLIC ACCESS:
-- ==========================================
/*
-- Re-enable with public access policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON profiles;
CREATE POLICY "allow_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON attendance;
CREATE POLICY "allow_all" ON attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON tasks;
CREATE POLICY "allow_all" ON tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON leaves;
CREATE POLICY "allow_all" ON leaves FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON settings;
CREATE POLICY "allow_all" ON settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON activity_log;
CREATE POLICY "allow_all" ON activity_log FOR ALL USING (true) WITH CHECK (true);
*/

-- ==========================================
-- VERIFY TABLES EXIST
-- ==========================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- ==========================================
-- CHECK EXISTING DATA
-- ==========================================
SELECT id, phone, name, role, is_active FROM profiles;
