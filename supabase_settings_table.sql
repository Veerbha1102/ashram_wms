-- Create settings table for kiosk device registration and other system settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous users to read settings
CREATE POLICY "Anyone can read settings" ON settings
    FOR SELECT USING (true);

-- Only allow admins to update settings (you can customize this)
CREATE POLICY "Admins can update settings" ON settings
    FOR ALL USING (true);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
    ('default_work_hours', '8'),
    ('late_time', '09:30')
ON CONFLICT (key) DO NOTHING;
