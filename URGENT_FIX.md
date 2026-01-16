# 🚨 URGENT FIX - User Creation Error

## Problem
Getting "Database error creating new user" when adding users in admin panel.

## Solution (Follow in Order)

### Step 1: Run Database Fix
1. Open **Supabase Dashboard** → **SQL Editor**
2. Open file: `FIX_DATABASE_NOW.sql`
3. Copy ALL the SQL and paste into SQL Editor
4. Click **Run**

### Step 2: Restart Your Dev Server
```bash
# Press Ctrl+C to stop current server
npm run dev
```

### Step 3: Test Adding a User
1. Go to `http://localhost:3000/login`
2. Login with your Gmail
3. Go to **Admin** → **Authorized Users**
4. Click **Add User**
5. Fill in:
   - **Gmail**: yourtest@gmail.com
   - **Name**: Test User
   - **Role**: worker
6. Click **Add User**

✅ Should work now!

---

## If Still Getting Error

### Check Browser Console
1. Press `F12` to open developer tools
2. Go to **Console** tab
3. Look for red error messages
4. Copy the FULL error and share with me

### Check Supabase Logs
1. **Supabase Dashboard** → **Logs** → **Database**
2. Look for recent errors
3. Screenshot or copy the error

### Check Service Role Key
Make sure `.env.local` has:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Not the `anon` key - it should be the **service_role** key from:
**Supabase Dashboard** → **Settings** → **API** → **service_role** (secret)

---

## Quick Debug Commands

Run these in Supabase SQL Editor to check:

```sql
-- Check profiles table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Check if authorized_users table exists
SELECT COUNT(*) FROM authorized_users;
```
