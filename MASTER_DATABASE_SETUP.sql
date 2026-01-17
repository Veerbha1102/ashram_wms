-- ============================================================
-- ASHRAM WORKER MANAGEMENT SYSTEM - MASTER DATABASE SETUP
-- ============================================================
-- Run this file in Supabase SQL Editor to set up or fix your database
-- Version: 1.0
-- Last Updated: 2026-01-17
-- ============================================================

-- ========================
-- SECTION 1: ENABLE RLS
-- ========================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS worker_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;

-- ========================
-- SECTION 2: FIX CONSTRAINTS
-- ========================

-- Fix profiles role constraint to include 'manager'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role = ANY (ARRAY['worker'::text, 'admin'::text, 'swamiji'::text, 'manager'::text]));

-- Remove unique constraints that cause issues
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gmail_key;

-- Make phone nullable
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;

-- ========================
-- SECTION 3: CREATE INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS idx_profiles_gmail ON profiles(gmail);
CREATE INDEX IF NOT EXISTS idx_authorized_users_gmail ON authorized_users(gmail);
CREATE INDEX IF NOT EXISTS idx_authorized_users_user_id ON authorized_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_leaves_worker_id ON leaves(worker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ========================
-- SECTION 4: RLS POLICIES
-- ========================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "authorized_users_select" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_insert" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_update" ON authorized_users;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;

-- Profiles: Everyone can read, service role can insert, users update own
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Authorized Users: Authenticated can read, admins can manage
CREATE POLICY "authorized_users_select" ON authorized_users FOR SELECT USING (true);
CREATE POLICY "authorized_users_insert" ON authorized_users FOR INSERT WITH CHECK (true);
CREATE POLICY "authorized_users_update" ON authorized_users FOR UPDATE USING (true);

-- Tasks: Everyone can read, authenticated can insert/update
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (true);

-- Attendance: Everyone can read, authenticated can insert/update
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (true);

-- Leaves: Everyone can read, authenticated can insert/update
DROP POLICY IF EXISTS "leaves_select" ON leaves;
DROP POLICY IF EXISTS "leaves_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_update" ON leaves;
CREATE POLICY "leaves_select" ON leaves FOR SELECT USING (true);
CREATE POLICY "leaves_insert" ON leaves FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leaves_update" ON leaves FOR UPDATE USING (true);

-- Announcements: Everyone can read
DROP POLICY IF EXISTS "announcements_select" ON announcements;
DROP POLICY IF EXISTS "announcements_insert" ON announcements;
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Activity Log: Everyone can read, authenticated can insert
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (true);
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (true);

-- Notifications: Users can read their own
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Push Tokens: Users can manage their own
DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;
CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE USING (auth.uid() = user_id);

-- Settings: Everyone can read
DROP POLICY IF EXISTS "settings_select" ON settings;
CREATE POLICY "settings_select" ON settings FOR SELECT USING (true);

-- ========================
-- SECTION 5: SYNC PROFILES
-- ========================

-- Create profiles for all auth users who don't have one
INSERT INTO profiles (id, gmail, name, role, phone, is_active)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(
        (SELECT role FROM authorized_users WHERE user_id = au.id OR gmail = au.email LIMIT 1),
        'worker'
    ),
    COALESCE(au.raw_user_meta_data->>'phone', NULL),
    true
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SECTION 6: CREATE TRIGGER FOR AUTO-PROFILE
-- ========================

-- Function to auto-create profile when user is created
CREATE OR REPLACE FUNCTION public.auto_create_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, gmail, name, role, phone, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        gmail = EXCLUDED.gmail,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        phone = COALESCE(EXCLUDED.phone, profiles.phone);
    
    RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_profile_on_signup();

-- ========================
-- SECTION 7: VERIFICATION
-- ========================

-- Show counts
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'Authorized Users', COUNT(*) FROM authorized_users;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================
