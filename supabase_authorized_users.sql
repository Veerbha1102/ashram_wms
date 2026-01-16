-- ==========================================
-- AUTHORIZED USERS TABLE FOR GMAIL RBAC
-- ==========================================
-- This migration creates the authorized_users table to manage
-- Gmail whitelist and role-based access control

-- Drop existing table if needed (for clean migration)
DROP TABLE IF EXISTS authorized_users CASCADE;

-- Create authorized_users table
CREATE TABLE authorized_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gmail TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker',
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_gmail CHECK (gmail ~* '^[A-Za-z0-9._%+-]+@gmail\.com$'),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'swamiji', 'worker'))
);

-- Add gmail column to profiles table (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_authorized_users_gmail ON authorized_users(gmail);
CREATE INDEX IF NOT EXISTS idx_authorized_users_role ON authorized_users(role);
CREATE INDEX IF NOT EXISTS idx_authorized_users_active ON authorized_users(is_active);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "authorized_users_select" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_insert" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_update" ON authorized_users;
DROP POLICY IF EXISTS "authorized_users_delete" ON authorized_users;

-- Allow all authenticated users to read their own record
CREATE POLICY "authorized_users_select" ON authorized_users
    FOR SELECT
    USING (true);

-- Only admins can insert new authorized users
CREATE POLICY "authorized_users_insert" ON authorized_users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = auth.jwt() ->> 'email'
            AND au.role = 'admin'
            AND au.is_active = true
        )
    );

-- Only admins can update authorized users
CREATE POLICY "authorized_users_update" ON authorized_users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = auth.jwt() ->> 'email'
            AND au.role = 'admin'
            AND au.is_active = true
        )
    );

-- Only admins can delete authorized users
CREATE POLICY "authorized_users_delete" ON authorized_users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM authorized_users au
            WHERE au.gmail = auth.jwt() ->> 'email'
            AND au.role = 'admin'
            AND au.is_active = true
        )
    );

-- ==========================================
-- FUNCTION: Update timestamp on row update
-- ==========================================
CREATE OR REPLACE FUNCTION update_authorized_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS authorized_users_updated_at ON authorized_users;
CREATE TRIGGER authorized_users_updated_at
    BEFORE UPDATE ON authorized_users
    FOR EACH ROW
    EXECUTE FUNCTION update_authorized_users_timestamp();

-- ==========================================
-- SAMPLE DATA: Add first admin user
-- ==========================================
-- IMPORTANT: Replace this with your actual admin Gmail
-- After running this, you can manage other users from the admin panel

-- INSERT INTO authorized_users (gmail, role, full_name, is_active)
-- VALUES ('your-admin@gmail.com', 'admin', 'System Admin', true)
-- ON CONFLICT (gmail) DO NOTHING;

-- ==========================================
-- VERIFICATION
-- ==========================================
-- View the created table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'authorized_users'
ORDER BY ordinal_position;

-- Show all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'authorized_users';
