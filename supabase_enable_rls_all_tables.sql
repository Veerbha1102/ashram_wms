-- ==========================================
-- ENABLE RLS ON ALL TABLES - CRITICAL FIX
-- ==========================================
-- This fixes the "Policy Exists RLS Disabled" errors

-- Enable RLS on all public tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'profiles', 'tasks', 'attendance', 'leaves', 
    'holidays', 'settings', 'activity_log', 
    'worker_holidays', 'holiday_settings'
)
ORDER BY tablename;

-- Expected result: rls_enabled = true for all tables

-- ==========================================
-- VERIFY POLICIES ARE ACTIVE
-- ==========================================
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
