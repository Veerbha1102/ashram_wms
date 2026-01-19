-- ============================================================
-- STRICT ROLE ENFORCEMENT
-- Run this in Supabase SQL Editor to enforce role types
-- ============================================================

-- 1. Create a custom type for roles if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'swamiji', 'worker', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add constraints to authorized_users table
ALTER TABLE authorized_users 
DROP CONSTRAINT IF EXISTS authorized_users_role_check;

ALTER TABLE authorized_users
ADD CONSTRAINT authorized_users_role_check 
CHECK (role IN ('admin', 'swamiji', 'worker', 'manager'));

-- 3. Add constraints to profiles table
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'swamiji', 'worker', 'manager'));

-- 4. Create a function to automatically sync authorized_users changes to profiles
CREATE OR REPLACE FUNCTION sync_authorized_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing profile if it matches the email (gmail)
    UPDATE profiles
    SET 
        role = NEW.role,
        is_active = NEW.is_active,
        name = NEW.full_name
    WHERE gmail = NEW.gmail;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on authorized_users
DROP TRIGGER IF EXISTS on_auth_user_update ON authorized_users;
CREATE TRIGGER on_auth_user_update
AFTER UPDATE ON authorized_users
FOR EACH ROW
EXECUTE FUNCTION sync_authorized_user_to_profile();

-- 6. Verify existing data (Optional - helps clean up bad data)
-- UPDATE authorized_users SET role = 'worker' WHERE role NOT IN ('admin', 'swamiji', 'worker', 'manager');
-- UPDATE profiles SET role = 'worker' WHERE role NOT IN ('admin', 'swamiji', 'worker', 'manager');

SELECT 'Strict roles enforced' as status;
