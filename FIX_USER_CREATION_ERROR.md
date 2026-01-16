# Quick Fix for "Database error creating new user"

Run these queries in Supabase SQL Editor **in this order**:

## Step 1: Fix profiles table defaults
```sql
-- Make sure role has a default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'worker';

-- Make sure is_active has default
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;

-- Gmail can be null (will be set by trigger or API)
ALTER TABLE profiles ALTER COLUMN gmail DROP NOT NULL;
```

## Step 2: Verify the fix
```sql
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('gmail', 'role', 'is_active')
ORDER BY column_name;
```

Expected result:
- `gmail`: nullable = YES
- `role`: default = 'worker'::text, nullable = NO
- `is_active`: default = true, nullable = NO

## Step 3: Test Adding a User

1. Go to Admin → Authorized Users
2. Click "Add User"
3. Fill in:
   - Gmail: test@gmail.com
   - Name: Test User
   - Role: worker
4. Click Add

Should work now! ✅

## If still getting errors:

Check Supabase logs (Dashboard → Logs → Auth/Database) for the exact error message and share it with me.
