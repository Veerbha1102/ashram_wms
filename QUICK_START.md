# 🚀 Quick Start Guide - Gmail Authentication Setup

Follow these steps to get your Gmail-based authentication system running.

## Step 1: Add Environment Variables

Create or update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Where to find these:**
> - Go to Supabase Dashboard → Settings → API
> - Copy `URL`, `anon` key, and `service_role` key

---

## Step 2: Run Database Migrations

Open **Supabase SQL Editor** and run these files **in order**:

### 2.1 Create authorized_users table
```sql
-- Run: supabase_authorized_users.sql
```
[View File](file:///C:/Users/Veer%20Bhanushali/OneDrive/Desktop/Ashram/Worker%20management%20sys/ashram-oms/supabase_authorized_users.sql)

### 2.2 Sync with profiles table
```sql
-- Run: supabase_sync_auth_profiles.sql
```
[View File](file:///C:/Users/Veer%20Bhanushali/OneDrive/Desktop/Ashram/Worker%20management%20sys/ashram-oms/supabase_sync_auth_profiles.sql)

This will:
- ✅ Fix RLS policies
- ✅ Link `authorized_users` with `profiles` table
- ✅ Create auto-sync triggers
- ✅ Keep both tables in sync

---

## Step 3: Add Your First Admin User

You need to **manually create your first admin** before you can use the system.

### Option A: If you already have a Supabase Auth account

```sql
-- Replace with your actual Gmail
INSERT INTO authorized_users (gmail, role, full_name, is_active, user_id)
SELECT 
    'your-admin@gmail.com',
    'admin',
    'Your Name',
    true,
    id
FROM auth.users
WHERE email = 'your-admin@gmail.com';
```

### Option B: Create new admin from scratch

```sql
-- This creates both auth user and authorized user
-- Replace email and name
INSERT INTO authorized_users (gmail, role, full_name, is_active)
VALUES ('your-admin@gmail.com', 'admin', 'Your Name', true);
```

Then go to **Supabase Dashboard → Authentication → Users → Add User** manually, or use the forgot password flow to set your password.

---

## Step 4: Configure Supabase Authentication

Go to **Supabase Dashboard → Authentication → Configuration**:

### URL Configuration
- **Site URL**: `http://localhost:3000`

### Redirect URLs (add all of these):
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
http://localhost:3000/auth/set-password
```

### Email Provider
- ✅ Make sure **Email** provider is enabled
- Disable other providers if you want Gmail-only

---

## Step 5: Test the System

### 5.1 Start Development Server
```bash
npm run dev
```

### 5.2 Go to Login Page
```
http://localhost:3000/login
```

### 5.3 Test Scenarios

✅ **Login with your admin Gmail**
- Should redirect to `/admin`

✅ **Try unauthorized email**
- Should show "not authorized" error

✅ **Test Forgot Password**
- Click "Forgot Password?"
- Enter your Gmail
- Check email inbox/spam

✅ **Add New User (as admin)**
- Go to "Authorized Users" page
- Click "Add User"
- User receives invitation email

---

## Step 6: Verify Database Sync

Check that everything is linked properly:

```sql
-- Run this query to verify sync
SELECT 
    au.gmail,
    au.full_name,
    au.role,
    au.is_active,
    au.user_id,
    p.name as profile_name,
    p.role as profile_role
FROM authorized_users au
LEFT JOIN profiles p ON au.user_id = p.id;
```

You should see:
- `user_id` is populated
- `profile_name` matches `full_name`
- `profile_role` matches `role`

---

## Troubleshooting

### "User not authorized" error
- ✅ Check user exists in `authorized_users` table
- ✅ Check `is_active = true`
- ✅ Check email matches exactly (case-sensitive)

### Not receiving password reset emails
- ✅ Check spam folder
- ✅ Verify email provider is enabled in Supabase
- ✅ Check Supabase Logs → Auth for errors

### "Service role key" error
- ✅ Make sure you copied the `service_role` key (not `anon`)
- ✅ Check `.env.local` file exists
- ✅ Restart dev server after adding env vars

### Profile not syncing
- ✅ Run `supabase_sync_auth_profiles.sql` migration
- ✅ Check triggers were created successfully
- ✅ Manually sync: Re-save user in admin panel

---

## Next Steps

🎉 **System is ready!** You can now:

1. **Invite users** via admin panel
2. **Manage roles** (admin, manager, swamiji, worker)
3. **Activate/deactivate** user accounts
4. **Monitor** login activity in activity logs

For production deployment, see [SUPABASE_SETUP.md](file:///C:/Users/Veer%20Bhanushali/OneDrive/Desktop/Ashram/Worker%20management%20sys/ashram-oms/SUPABASE_SETUP.md)
