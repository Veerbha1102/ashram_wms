-- Insert sample users for testing
-- Run this in Supabase SQL Editor

-- Admin user
INSERT INTO profiles (id, name, phone, pin, role, is_active, created_at)
VALUES (
    gen_random_uuid(),
    'Admin',
    '9274173384',
    '1234',
    'admin',
    true,
    NOW()
) ON CONFLICT (phone) DO NOTHING;

-- Swamiji user
INSERT INTO profiles (id, name, phone, pin, role, is_active, created_at)
VALUES (
    gen_random_uuid(),
    'Swamiji',
    '9999999999',
    '1111',
    'swamiji',
    true,
    NOW()
) ON CONFLICT (phone) DO NOTHING;

-- Worker user (the main worker)
INSERT INTO profiles (id, name, phone, pin, role, is_active, created_at)
VALUES (
    gen_random_uuid(),
    'Ramesh Kumar',
    '8888888888',
    '2222',
    'worker',
    true,
    NOW()
) ON CONFLICT (phone) DO NOTHING;

-- View all users
SELECT id, name, phone, role FROM profiles;
