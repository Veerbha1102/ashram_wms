-- Create settings table if not exists
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe for re-run)
DROP POLICY IF EXISTS "Everyone can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

CREATE POLICY "Everyone can view settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON settings FOR ALL USING (true);

-- Insert default emergency contact (update this with your actual number)
INSERT INTO settings (key, value) VALUES
    ('emergency_contact', '9274173384'),
    ('late_time', '09:30'),
    ('whatsapp_message', 'Hari Om. You have not started work yet. Please come to office immediately.')
ON CONFLICT (key) DO NOTHING;
