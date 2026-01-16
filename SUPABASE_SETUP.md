# Supabase Configuration Guide for Gmail-Based Authentication

This guide will help you configure Supabase to enable Gmail-only authentication with custom email templates.

## Step 1: Get Your Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) → **API**
3. Copy the `service_role` secret key (NOT the `anon` key)
4. Add it to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 2: Run the Database Migration

1. Go to Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Paste and run the contents of `supabase_authorized_users.sql`
4. Verify the table was created successfully

## Step 3: Add Your First Admin User

After running the migration, add your first admin user by uncommenting and running this SQL:

```sql
INSERT INTO authorized_users (gmail, role, full_name, is_active)
VALUES ('your-admin@gmail.com', 'admin', 'Your Name', true)
ON CONFLICT (gmail) DO NOTHING;
```

## Step 4: Configure Email Authentication

1. Go to **Authentication** → **Providers**
2. **Enable Email provider** (should be enabled by default)
3. Disable all other providers (Google, GitHub, etc.) if you want Gmail-only
4. Configure **Email Templates**:

### Confirm Signup Template
```html
<h2>Welcome to AAKB Worker Management!</h2>
<p>Click the link below to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
```

### Reset Password Template
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, please ignore this email.</p>
<p>This link will expire in 1 hour.</p>
```

### Invite User Template
```html
<h2>You've been invited to AAKB Worker Management</h2>
<p>An administrator has granted you access to the AAKB Worker Management System.</p>
<p>Click the link below to set your password and get started:</p>
<p><a href="{{ .ConfirmationURL }}">Set Password</a></p>
```

## Step 5: Configure Email Settings

1. Go to **Settings** → **Project Settings** → **Auth**
2. Configure these settings:
   - **Site URL**: `http://localhost:3000` (or your production URL)
   - **Redirect URLs**: Add these:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/reset-password`
     - `http://localhost:3000/auth/set-password`

## Step 6: Test the System

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Try logging in with your admin Gmail and password
4. If you haven't set a password, use the "Forgot Password" link

## Step 7: Invite Additional Users

1. Log in as admin
2. Go to **Authorized Users** page
3. Click **Add User**
4. Enter Gmail, name, and role
5. User will receive an email to set their password

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit your `SUPABASE_SERVICE_ROLE_KEY` to Git
- The service role key has full admin access to your database
- Only use it in server-side API routes, never in client code
- Add `.env.local` to your `.gitignore`

## Troubleshooting

**Users not receiving emails?**
- Check Supabase **Logs** → **Auth** for email errors
- Verify email templates are configured
- Check spam folder
- For  production, configure custom SMTP in Supabase settings

**Gmail validation not working?**
- The system only allows emails ending with `@gmail.com`
- Update the validation in `authorized_users` table constraint if needed

**Can't log in?**
- Verify user exists in `authorized_users` table and is_active = true
- Check Supabase Auth logs for errors
- Try password reset if password is forgotten
