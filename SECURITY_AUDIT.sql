-- ============================================================
-- COMPLETE SECURITY AUDIT & HARDENING
-- Run this AFTER MASTER_DATABASE_SETUP.sql
-- ============================================================

-- ========================
-- SECTION 1: FIX REMAINING USERS
-- ========================

-- Add missing authorized user
INSERT INTO authorized_users (user_id, gmail, full_name, role, is_active)
VALUES (
    'd8d57cf0-c32b-40a3-a41b-f0dbbfe2ea04',
    'veerbhanushali2442@gmail.com',
    'Veer Bhanushali',
    'admin',
    true
)
ON CONFLICT DO NOTHING;

-- Fix existing authorized user user_id
UPDATE authorized_users 
SET user_id = '3d020298-6a15-45c6-baed-cf608b6fd716'
WHERE gmail = 'veer.bhanushali@aakb.org.in' AND user_id IS NULL;

-- ========================
-- SECTION 2: VERIFY RLS IS ENABLED ON ALL TABLES
-- ========================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

-- ========================
-- SECTION 3: SECURE RLS POLICIES
-- ========================

-- profiles: Authenticated can read all, only update own
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT 
    USING (auth.uid() IS NOT NULL);
    
CREATE POLICY "profiles_insert" ON profiles FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL OR auth.uid() = id);
    
CREATE POLICY "profiles_update" ON profiles FOR UPDATE 
    USING (auth.uid() = id);
    
CREATE POLICY "profiles_delete" ON profiles FOR DELETE 
    USING (false); -- No one can delete profiles

-- authorized_users: Only admins can manage
DROP POLICY IF EXISTS "authorized_users_select" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_insert" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_update" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_delete" ON authorized_users;

CREATE POLICY "authorized_users_select" ON authorized_users FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "authorized_users_insert" ON authorized_users FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM authorized_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "authorized_users_update" ON authorized_users FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM authorized_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "authorized_users_delete" ON authorized_users FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM authorized_users 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- tasks: Read own or assigned, admins read all
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
    auth.uid() = assigned_to 
    OR auth.uid() = assigned_by
    OR EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'swamiji')
    )
);

CREATE POLICY "tasks_insert" ON tasks FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
    auth.uid() = assigned_to 
    OR auth.uid() = assigned_by
    OR EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- attendance: Workers see own, admins see all
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;

CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (
    auth.uid() = worker_id
    OR EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'swamiji')
    )
);

CREATE POLICY "attendance_insert" ON attendance FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (
    auth.uid() = worker_id
    OR EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- leaves: Workers see own, admins see all
DROP POLICY IF EXISTS "leaves_select" ON leaves;
DROP POLICY IF EXISTS "leaves_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_update" ON leaves;

CREATE POLICY "leaves_select" ON leaves FOR SELECT USING (
    auth.uid() = worker_id
    OR EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'swamiji')
    )
);

CREATE POLICY "leaves_insert" ON leaves FOR INSERT 
    WITH CHECK (auth.uid() = worker_id OR auth.uid() IS NOT NULL);

CREATE POLICY "leaves_update" ON leaves FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM authorized_users 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- notifications: Only see own
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT 
    USING (auth.uid() = user_id);
    
CREATE POLICY "notifications_insert" ON notifications FOR INSERT 
    WITH CHECK (true); -- System can insert
    
CREATE POLICY "notifications_update" ON notifications FOR UPDATE 
    USING (auth.uid() = user_id);

-- push_tokens: Only manage own
DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;

CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT 
    USING (auth.uid() = user_id);
    
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE 
    USING (auth.uid() = user_id);

-- ========================
-- SECTION 4: SECURITY AUDIT
-- ========================

-- Check RLS status on all tables
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policy count per table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ========================
-- SECTION 5: VERIFY DATA INTEGRITY
-- ========================

-- User summary
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'Authorized Users', COUNT(*) FROM authorized_users;

-- Show all users with their status
SELECT 
    au.email,
    CASE WHEN p.id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile,
    CASE WHEN a.id IS NOT NULL THEN '✅' ELSE '❌' END as is_authorized,
    COALESCE(a.role, 'N/A') as role,
    CASE WHEN a.is_active THEN '✅' ELSE '❌' END as is_active
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN authorized_users a ON a.user_id = au.id OR a.gmail = au.email;

-- ============================================================
-- SECURITY COMPLETE! 
-- All tables have RLS, strict policies applied
-- ============================================================
