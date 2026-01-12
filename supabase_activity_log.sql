-- Drop table if it exists (to recreate cleanly)
DROP TABLE IF EXISTS activity_log CASCADE;

-- Create activity_log table fresh
CREATE TABLE activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "public_access" ON activity_log FOR ALL USING (true) WITH CHECK (true);
