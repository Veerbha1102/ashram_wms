-- Create holidays table for system-wide holidays
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    holiday_type TEXT DEFAULT 'full' CHECK (holiday_type IN ('full', 'half')),
    half_day_end_time TIME DEFAULT '13:00', -- For half days, work ends at this time
    is_recurring BOOLEAN DEFAULT false, -- If true, repeats every year
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create worker_holidays table for worker-selected holidays/offs
CREATE TABLE IF NOT EXISTS worker_holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    holiday_type TEXT DEFAULT 'full' CHECK (holiday_type IN ('full', 'half')),
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

-- Create holiday_settings for configuration
CREATE TABLE IF NOT EXISTS holiday_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO holiday_settings (setting_key, setting_value) VALUES
    ('sunday_half_day', 'true'),
    ('sunday_end_time', '13:00'),
    ('monthly_holidays_allowed', '4'),
    ('allow_consecutive_holidays', 'false')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view holidays" ON holidays FOR SELECT USING (true);
CREATE POLICY "Admin can manage holidays" ON holidays FOR ALL USING (true);

CREATE POLICY "Workers can view own holidays" ON worker_holidays FOR SELECT USING (true);
CREATE POLICY "Workers can request holidays" ON worker_holidays FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can manage worker holidays" ON worker_holidays FOR ALL USING (true);

CREATE POLICY "Everyone can view holiday settings" ON holiday_settings FOR SELECT USING (true);
CREATE POLICY "Admin can update holiday settings" ON holiday_settings FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_worker_holidays_worker ON worker_holidays(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_holidays_date ON worker_holidays(date);
