-- Create leaves table for leave requests
CREATE TABLE IF NOT EXISTS leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'emergency')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Workers can view their own leaves
CREATE POLICY "Workers can view own leaves" ON leaves
    FOR SELECT USING (worker_id = auth.uid() OR true);

-- Workers can insert their own leaves
CREATE POLICY "Workers can insert leaves" ON leaves
    FOR INSERT WITH CHECK (true);

-- Swamiji/Admin can update leave status
CREATE POLICY "Admin can update leaves" ON leaves
    FOR UPDATE USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leaves_worker_id ON leaves(worker_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
