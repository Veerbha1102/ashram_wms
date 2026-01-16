-- ==========================================
-- TASK PRIORITIES & NOTIFICATIONS SCHEMA
-- ==========================================

-- Step 1: Add priority to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Add constraint for valid priorities
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS valid_priority;

ALTER TABLE tasks
ADD CONSTRAINT valid_priority 
CHECK (priority IN ('medium', 'important', 'urgent'));

-- Create index for faster priority-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Update existing tasks to have default priority
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;

-- ==========================================
-- Step 2: Create push_tokens table
-- ==========================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL, -- 'android', 'ios', or 'web'
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_platform CHECK (platform IN ('android', 'ios', 'web'))
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "push_tokens_select" ON push_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert" ON push_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_update" ON push_tokens
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "push_tokens_delete" ON push_tokens
    FOR DELETE USING (user_id = auth.uid());

-- ==========================================
-- Step 3: Create notifications table
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    type TEXT DEFAULT 'info', -- 'info', 'task', 'leave', 'urgent'
    read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_notification_type CHECK (type IN ('info', 'task', 'leave', 'urgent', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Only system can insert notifications (via service role)
CREATE POLICY "notifications_insert" ON notifications
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- Step 4: Create notification_settings table
-- ==========================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    task_notifications BOOLEAN DEFAULT true,
    leave_notifications BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_all" ON notification_settings
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Check tasks table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'priority';

-- Count tokens
SELECT COUNT(*) as total_tokens FROM push_tokens;

-- Count notifications
SELECT COUNT(*) as total_notifications FROM notifications;

-- Sample task priorities distribution
SELECT 
    priority,
    COUNT(*) as count
FROM tasks
GROUP BY priority
ORDER BY 
    CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'important' THEN 2
        WHEN 'medium' THEN 3
    END;
