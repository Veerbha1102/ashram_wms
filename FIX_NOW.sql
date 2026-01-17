-- ============================================================
-- FIX DATABASE ERRORS - Run this NOW in Supabase SQL Editor
-- ============================================================

-- 1. Ensure settings table exists
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS and allow read
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_all" ON settings;
CREATE POLICY "settings_all" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 3. Fix profiles table - ensure all columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 4. Fix profiles RLS to allow insert/update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_all" ON profiles;

CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- 5. Fix authorized_users RLS
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authorized_users_select" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_insert" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_update" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_all" ON authorized_users;

CREATE POLICY "authorized_users_all" ON authorized_users FOR ALL USING (true) WITH CHECK (true);

-- 6. Fix time_logs table if missing
CREATE TABLE IF NOT EXISTS time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    mode TEXT NOT NULL DEFAULT 'office' CHECK (mode IN ('office', 'field', 'event')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "time_logs_all" ON time_logs;
CREATE POLICY "time_logs_all" ON time_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Verify
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'authorized_users', COUNT(*) FROM authorized_users
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'time_logs', COUNT(*) FROM time_logs;

-- ============================================================
-- DONE! Now you can add workers
-- ============================================================
