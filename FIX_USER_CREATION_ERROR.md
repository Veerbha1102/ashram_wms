# 🔍 Quick Fix: User Creation Error

The error is likely due to one of these issues:

## Option 1: Service Role Key Missing
Check your `.env.local` file has the **service_role** key (NOT anon key):

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (starts with eyJ)
```

Get it from: **Supabase Dashboard** → **Settings** → **API** → **service_role** (click to reveal)

## Option 2: RLS Blocking Service Role

Run this in Supabase SQL Editor:

```sql
-- Temporarily fix RLS policy for profiles
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (
        -- Allow service role (for user creation API)
        current_setting('role') = 'service_role'
        OR
        -- Allow admins
        EXISTS (
            SELECT 1 FROM authorized_users
            WHERE gmail = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND role = 'admin'
            AND is_active = true
        )
    );
```

## Option 3: Check Browser Console

1. Open your app
2. Press **F12** (developer tools)
3. Go to **Console** tab
4. Try adding a user
5. Copy the FULL error message and share it with me

## Option 4: Check Supabase Logs

1. Go to **Supabase Dashboard** → **Logs** → **Database**
2. Look for recent errors
3. Share the error details

## Quick Test

After adding service role key, restart your server:
```bash
npm run dev
```

Then try adding a user again!
