# Adding Users via Supabase Dashboard

## Step 1: Create User in Auth
1. Go to: https://supabase.com/dashboard/project/glzpnlzpmqlgpobgehkw/auth/users
2. Click **"Create a new user"**
3. Email: (must end with `@gmail.com` or `@aakb.org.in`)
4. Password: Set one
5. ✅ Check **"Auto Confirm User?"**
6. Click **"Create user"**
7. **Copy the UID** shown

## Step 2: Add to Database Tables
Go to **SQL Editor** and run (replace UID and details):

```sql
-- Add to authorized_users
INSERT INTO authorized_users (id, gmail, full_name, role, is_active)
VALUES (
    'PASTE_UID_HERE',
    'user@gmail.com',  -- or @aakb.org.in
    'User Full Name',
    'worker',  -- or 'admin', 'manager', 'swamiji'
    true
);

-- Add to profiles
INSERT INTO profiles (id, gmail, name, role, phone, is_active)
VALUES (
    'PASTE_UID_HERE',  -- Same UID
    'user@gmail.com',
    'User Full Name',
    'worker',
    'user@gmail.com',  -- Can use email for now
    true
);
```

## Available Roles
- `admin` - Full access
- `manager` - Can manage workers
- `swamiji` - Read-only access
- `worker` - Basic access

## That's it!
User can now login at your app with their email/password.

## Alternative: Use App's UI (Easier!)
Once you're logged in as admin locally:
- Go to Settings → Add User
- Fill the form
- It does all 3 steps automatically! ✅
