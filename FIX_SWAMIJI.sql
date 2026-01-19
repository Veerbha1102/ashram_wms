-- ============================================================
-- FIX: Authorize admin@aakb.org.in as Swamiji
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Insert or Update authorized_users (Removed 'phone' column)
INSERT INTO authorized_users (gmail, full_name, role, is_active)
VALUES ('admin@aakb.org.in', 'Swamiji', 'swamiji', true)
ON CONFLICT (gmail) 
DO UPDATE SET 
    role = 'swamiji',
    is_active = true,
    full_name = 'Swamiji';

-- 2. Update profiles if the user has already tried to login
-- Note: Profiles table DOES have phone, but we only update if exists
UPDATE profiles
SET role = 'swamiji', is_active = true, name = 'Swamiji'
WHERE gmail = 'admin@aakb.org.in';

SELECT * FROM authorized_users WHERE gmail = 'admin@aakb.org.in';
