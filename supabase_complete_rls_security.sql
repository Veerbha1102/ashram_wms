-- ==========================================
-- COMPLETE ROLE-BASED SECURITY (RLS) POLICIES
-- ==========================================
-- This defines exactly what each role can do in the database

-- Role Permissions Summary:
-- ADMIN: Full access to everything
-- MANAGER: Same as admin (can manage workers, tasks, leaves)
-- SWAMIJI: Read-only access to view workers, attendance, tasks
-- WORKER: Can only view/edit their own data

-- ==========================================
-- HELPER FUNCTION: Get current user's role
-- ==========================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM authorized_users 
        WHERE gmail = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PROFILES TABLE
-- ==========================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- Everyone can view profiles
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT
    USING (true);

-- Only service role can insert (for user creation)
CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT
    WITH CHECK (true);

-- Admin/Manager can update any profile, workers can update their own
CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE
    USING (
        get_user_role() IN ('admin', 'manager')
        OR auth.uid() = id
    );

-- Only Admin can delete profiles
CREATE POLICY "profiles_delete" ON profiles
    FOR DELETE
    USING (get_user_role() = 'admin');

-- ==========================================
-- TASKS TABLE
-- ==========================================
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- Admin/Manager/Swamiji can view all tasks, workers see only their own
CREATE POLICY "tasks_select" ON tasks
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'manager', 'swamiji')
        OR assigned_to = (SELECT id FROM profiles WHERE id = auth.uid())
    );

-- Only Admin/Manager can create tasks
CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Admin/Manager can update any, workers can update status of their own
CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE
    USING (
        get_user_role() IN ('admin', 'manager')
        OR (assigned_to = (SELECT id FROM profiles WHERE id = auth.uid()) 
            AND get_user_role() = 'worker')
    );

-- Only Admin/Manager can delete tasks
CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE
    USING (get_user_role() IN ('admin', 'manager'));

-- ==========================================
-- ATTENDANCE TABLE
-- ==========================================
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;
DROP POLICY IF EXISTS "attendance_delete" ON attendance;

-- Admin/Manager/Swamiji can view all, workers see only their own
CREATE POLICY "attendance_select" ON attendance
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'manager', 'swamiji')
        OR worker_id = (SELECT id FROM profiles WHERE id = auth.uid())
    );

-- Admin/Manager/Workers can mark attendance (workers only their own)
CREATE POLICY "attendance_insert" ON attendance
    FOR INSERT
    WITH CHECK (
        get_user_role() IN ('admin', 'manager')
        OR (worker_id = (SELECT id FROM profiles WHERE id = auth.uid()) 
            AND get_user_role() = 'worker')
    );

-- Admin/Manager can update any attendance
CREATE POLICY "attendance_update" ON attendance
    FOR UPDATE
    USING (get_user_role() IN ('admin', 'manager'));

-- Only Admin can delete attendance records
CREATE POLICY "attendance_delete" ON attendance
    FOR DELETE
    USING (get_user_role() = 'admin');

-- ==========================================
-- LEAVES TABLE
-- ==========================================
DROP POLICY IF EXISTS "leaves_select" ON leaves;
DROP POLICY IF EXISTS "leaves_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_update" ON leaves;
DROP POLICY IF EXISTS "leaves_delete" ON leaves;

-- Admin/Manager can view all, workers see only their own
CREATE POLICY "leaves_select" ON leaves
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'manager')
        OR worker_id = (SELECT id FROM profiles WHERE id = auth.uid())
    );

-- Workers can request leave, admin/manager can create for anyone
CREATE POLICY "leaves_insert" ON leaves
    FOR INSERT
    WITH CHECK (
        get_user_role() IN ('admin', 'manager')
        OR (worker_id = (SELECT id FROM profiles WHERE id = auth.uid()) 
            AND get_user_role() = 'worker')
    );

-- Admin/Manager can approve/reject, workers can only update their pending requests
CREATE POLICY "leaves_update" ON leaves
    FOR UPDATE
    USING (
        get_user_role() IN ('admin', 'manager')
        OR (worker_id = (SELECT id FROM profiles WHERE id = auth.uid()) 
            AND status = 'pending'
            AND get_user_role() = 'worker')
    );

-- Only Admin/Manager can delete leave requests
CREATE POLICY "leaves_delete" ON leaves
    FOR DELETE
    USING (get_user_role() IN ('admin', 'manager'));

-- ==========================================
-- HOLIDAYS TABLE
-- ==========================================
DROP POLICY IF EXISTS "holidays_select" ON holidays;
DROP POLICY IF EXISTS "holidays_insert" ON holidays;
DROP POLICY IF EXISTS "holidays_update" ON holidays;
DROP POLICY IF EXISTS "holidays_delete" ON holidays;

-- Everyone can view holidays
CREATE POLICY "holidays_select" ON holidays
    FOR SELECT
    USING (true);

-- Only Admin/Manager can add holidays
CREATE POLICY "holidays_insert" ON holidays
    FOR INSERT
    WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Only Admin/Manager can update holidays
CREATE POLICY "holidays_update" ON holidays
    FOR UPDATE
    USING (get_user_role() IN ('admin', 'manager'));

-- Only Admin can delete holidays
CREATE POLICY "holidays_delete" ON holidays
    FOR DELETE
    USING (get_user_role() = 'admin');

-- ==========================================
-- SETTINGS TABLE
-- ==========================================
DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;
DROP POLICY IF EXISTS "settings_delete" ON settings;

-- Everyone can view settings
CREATE POLICY "settings_select" ON settings
    FOR SELECT
    USING (true);

-- Only Admin can modify settings
CREATE POLICY "settings_insert" ON settings
    FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "settings_update" ON settings
    FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "settings_delete" ON settings
    FOR DELETE
    USING (get_user_role() = 'admin');

-- ==========================================
-- ACTIVITY_LOG TABLE
-- ==========================================
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;

-- Admin/Manager can view all logs, others cannot see
CREATE POLICY "activity_log_select" ON activity_log
    FOR SELECT
    USING (get_user_role() IN ('admin', 'manager'));

-- Anyone can insert activity logs (system logging)
CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT
    WITH CHECK (true);

-- No one can update or delete activity logs (audit trail)

-- ==========================================
-- AUTHORIZED_USERS TABLE (already has policies)
-- ==========================================
-- Policies were created in supabase_sync_auth_profiles.sql
-- Admin-only access for modifications

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

-- Users can only see their own notifications
CREATE POLICY "notifications_select" ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- System can insert notifications (service role)
CREATE POLICY "notifications_insert" ON notifications
    FOR INSERT
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update" ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- ==========================================
-- PUSH_TOKENS TABLE
-- ==========================================
-- Policies already created in supabase_task_priorities_notifications.sql
-- Users can manage their own tokens

-- ==========================================
-- NOTIFICATION_SETTINGS TABLE
-- ==========================================
-- Policies already created in supabase_task_priorities_notifications.sql
-- Users can manage their own settings

-- ==========================================
-- VERIFICATION
-- ==========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ==========================================
-- TEST QUERIES (Don't run, just for reference)
-- ==========================================

-- Test as admin (should see all):
-- SELECT * FROM tasks;

-- Test as worker (should see only their tasks):
-- SELECT * FROM tasks WHERE assigned_to = auth.uid();

-- Test insert as worker (should fail):
-- INSERT INTO settings (key, value) VALUES ('test', 'test');

-- Test delete as manager (should work):
-- DELETE FROM tasks WHERE id = 'some-task-id';
