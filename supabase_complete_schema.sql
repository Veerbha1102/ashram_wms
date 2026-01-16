-- Complete database schema for AAKB Worker Management System
-- Run this in Supabase SQL Editor to create all required tables

-- ==========================================
-- 1. PROFILES TABLE (Users - Admin, Swamiji, Worker)
-- ==========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE profiles SET is_active = true WHERE is_active IS NULL;
UPDATE profiles SET role = 'worker' WHERE role IS NULL;

-- ==========================================
-- 2. ATTENDANCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    status TEXT DEFAULT 'present',
    early_exit_requested BOOLEAN DEFAULT false,
    early_exit_reason TEXT,
    early_exit_approved BOOLEAN DEFAULT false,
    mode_changed_at TIMESTAMPTZ,
    total_hours DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON attendance;
CREATE POLICY "public_access" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 3. TASKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON tasks;
CREATE POLICY "public_access" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 4. LEAVES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type TEXT DEFAULT 'casual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON leaves;
CREATE POLICY "public_access" ON leaves FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 5. SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON settings;
CREATE POLICY "public_access" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('emergency_contact', '9274173384'),
    ('late_time', '09:30'),
    ('kiosk_device', '')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 6. ACTIVITY LOG TABLE (for long-term records)
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON activity_log;
CREATE POLICY "public_access" ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leaves_worker ON leaves(worker_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ==========================================
-- 7. HOLIDAYS TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    holiday_type TEXT DEFAULT 'full',
    half_day_end_time TIME DEFAULT '13:00',
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    holiday_type TEXT DEFAULT 'full',
    reason TEXT,
    status TEXT DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

CREATE TABLE IF NOT EXISTS holiday_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on holiday tables
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_access" ON holidays;
DROP POLICY IF EXISTS "public_access" ON worker_holidays;
DROP POLICY IF EXISTS "public_access" ON holiday_settings;

CREATE POLICY "public_access" ON holidays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON worker_holidays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON holiday_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert holiday defaults
INSERT INTO holiday_settings (setting_key, setting_value) VALUES
    ('sunday_half_day', 'true'),
    ('sunday_end_time', '13:00'),
    ('monthly_holidays_allowed', '4')
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- VERIFICATION: Show all tables
-- ==========================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
