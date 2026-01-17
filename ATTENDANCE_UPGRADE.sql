-- ============================================================
-- ATTENDANCE SYSTEM UPGRADE
-- Run in Supabase SQL Editor AFTER MASTER_DATABASE_SETUP.sql
-- ============================================================

-- ========================
-- 1. ADD MODE TO ATTENDANCE
-- ========================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'office';
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_mode_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_mode_check 
    CHECK (mode IN ('office', 'field', 'event'));
    
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id TEXT;

-- ========================
-- 2. CREATE TIME LOGS TABLE
-- ========================
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

-- Enable RLS
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "time_logs_select" ON time_logs FOR SELECT USING (true);
CREATE POLICY "time_logs_insert" ON time_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "time_logs_update" ON time_logs FOR UPDATE USING (auth.uid() = worker_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_time_logs_worker_date ON time_logs(worker_id, date);

-- ========================
-- 3. CREATE WORKER DEVICES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS worker_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'phone' CHECK (device_type IN ('laptop', 'phone')),
    device_name TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(worker_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE worker_devices ENABLE ROW LEVEL SECURITY;

-- Policies (admin can manage, workers read own)
CREATE POLICY "worker_devices_select" ON worker_devices FOR SELECT USING (true);
CREATE POLICY "worker_devices_insert" ON worker_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "worker_devices_update" ON worker_devices FOR UPDATE USING (true);
CREATE POLICY "worker_devices_delete" ON worker_devices FOR DELETE USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_worker_devices_worker ON worker_devices(worker_id);

-- ========================
-- 4. TRIGGER: NOTIFY SWAMIJI ON MODE CHANGES
-- ========================

-- Function to notify Swamiji
CREATE OR REPLACE FUNCTION notify_swamiji_on_mode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    worker_name TEXT;
    swamiji_ids UUID[];
BEGIN
    -- Get worker name
    SELECT name INTO worker_name FROM profiles WHERE id = NEW.worker_id;
    
    -- Get all Swamiji user IDs
    SELECT array_agg(user_id) INTO swamiji_ids 
    FROM authorized_users 
    WHERE role = 'swamiji' AND is_active = true AND user_id IS NOT NULL;
    
    -- Only notify for field or event modes
    IF NEW.mode IN ('field', 'event') THEN
        -- Insert notification for each Swamiji
        INSERT INTO notifications (user_id, title, body, type, data)
        SELECT 
            unnest(swamiji_ids),
            '📍 Worker Mode Change',
            worker_name || ' is now in ' || UPPER(NEW.mode) || ' mode',
            'info',
            jsonb_build_object('worker_id', NEW.worker_id, 'mode', NEW.mode)
        WHERE swamiji_ids IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_time_log_insert ON time_logs;
CREATE TRIGGER on_time_log_insert
    AFTER INSERT ON time_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_swamiji_on_mode_change();

-- ========================
-- 5. VERIFICATION
-- ========================
SELECT 'time_logs' as table_name, COUNT(*) as count FROM time_logs
UNION ALL
SELECT 'worker_devices', COUNT(*) FROM worker_devices
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance;

-- ============================================================
-- UPGRADE COMPLETE!
-- ============================================================
