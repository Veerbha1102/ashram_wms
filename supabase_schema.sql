-- =============================================
-- AAKB Worker Management System - Database Schema
-- Arsh Adhyayan Kendra, Bhuj
-- =============================================

-- 1. PROFILES TABLE (Users/Workers)
-- Stores all users: workers, admins, and swamiji
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  device_token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'admin', 'swamiji')),
  name TEXT NOT NULL,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATTENDANCE TABLE
-- Tracks daily check-in/check-out
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status TEXT CHECK (status IN ('present', 'absent', 'leave', 'half_day')) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, date)
);

-- 3. TASKS TABLE
-- All tasks assigned to workers
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  due_time TIME,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LEAVE REQUESTS TABLE
-- Workers can request leave
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DAILY REPORTS TABLE
-- Workers submit daily reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, date)
);

-- 6. ANNOUNCEMENTS TABLE
-- Admin/Swamiji can post announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  posted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ACTIVITY LOG TABLE
-- Tracks all important activities
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES for better performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_worker ON leave_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Policy: Allow all to read attendance  
CREATE POLICY "Attendance is viewable by everyone" ON attendance
  FOR SELECT USING (true);

-- Policy: Allow all to read tasks
CREATE POLICY "Tasks are viewable by everyone" ON tasks
  FOR SELECT USING (true);

-- Policy: Allow all to read leave requests
CREATE POLICY "Leave requests are viewable by everyone" ON leave_requests
  FOR SELECT USING (true);

-- Policy: Allow all to read daily reports
CREATE POLICY "Daily reports are viewable by everyone" ON daily_reports
  FOR SELECT USING (true);

-- Policy: Allow all to read announcements
CREATE POLICY "Announcements are viewable by everyone" ON announcements
  FOR SELECT USING (true);

-- Policy: Allow all to read activity log
CREATE POLICY "Activity log is viewable by everyone" ON activity_log
  FOR SELECT USING (true);

-- Policy: Allow insert/update for all (since we use device token auth)
CREATE POLICY "Allow all inserts on profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on attendance" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on leave_requests" ON leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on leave_requests" ON leave_requests FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on daily_reports" ON daily_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on daily_reports" ON daily_reports FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on announcements" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on announcements" ON announcements FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on activity_log" ON activity_log FOR INSERT WITH CHECK (true);

-- =============================================
-- SAMPLE DATA (Test Users)
-- =============================================

-- Swamiji Account
INSERT INTO profiles (phone, pin, device_token, role, name)
VALUES ('9999999999', '1234', 'swamiji-device-001', 'swamiji', 'Swami Pradeeptananda Sarswati')
ON CONFLICT (phone) DO NOTHING;

-- Admin Account
INSERT INTO profiles (phone, pin, device_token, role, name)
VALUES ('9876543210', '1234', 'admin-device-001', 'admin', 'Admin User')
ON CONFLICT (phone) DO NOTHING;

-- Worker Accounts
INSERT INTO profiles (phone, pin, device_token, role, name)
VALUES 
  ('9111111111', '1234', 'worker-device-001', 'worker', 'Ram Kumar'),
  ('9222222222', '1234', 'worker-device-002', 'worker', 'Shyam Das'),
  ('9333333333', '1234', 'worker-device-003', 'worker', 'Mohan Lal')
ON CONFLICT (phone) DO NOTHING;

-- Sample Announcement
INSERT INTO announcements (title, message, is_pinned)
VALUES (
  'Welcome to AAKB Worker System',
  'Jai Shri Krishna! This system will help us manage daily activities at the Kendra. Please check in daily using your device.',
  true
);

-- =============================================
-- DONE! Your database is ready.
-- =============================================
