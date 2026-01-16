-- Add missing columns to profiles table
-- Run this in Supabase SQL Editor

-- Add is_active column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add device_token column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Add pin column if missing  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;

-- Add role column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';

-- Add phone column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update existing rows to have is_active = true
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles';
