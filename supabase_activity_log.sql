-- Create activity_log table for tracking worker activities
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add mode_changed_at to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS mode_changed_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view activity log" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Workers can insert activity log" ON activity_log FOR INSERT WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_worker ON activity_log(worker_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
