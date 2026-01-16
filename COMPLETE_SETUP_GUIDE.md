# 🚀 COMPLETE SETUP GUIDE - Step by Step

This guide will walk you through completing the AAKB Worker Management System setup.

---

## PART 1: SECURE THE AUTHENTICATION SYSTEM ✅

### Step 1: Run Database Cleanup

Open **Supabase SQL Editor** and run these migrations in order:

#### 1.1 Remove Old Authentication
```sql
-- Run file: supabase_remove_old_auth.sql
```
This removes `device_token` and `pin` columns from database.

#### 1.2 Sync Auth with Profiles
```sql
-- Run file: supabase_sync_auth_profiles.sql
```
This links authorized_users with profiles table.

#### 1.3 Add Task Priorities & Notifications
```sql
-- Run file: supabase_task_priorities_notifications.sql
```
This adds priority to tasks and creates notification tables.

### Step 2: Add Your First Admin User

After running migrations, add yourself as admin:

```sql
-- Replace with your Gmail address
INSERT INTO authorized_users (gmail, role, full_name, is_active)
VALUES ('your-admin@gmail.com', 'admin', 'Your Name', true);
```

### Step 3: Configure Supabase Email Templates

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Copy templates from `EMAIL_TEMPLATES.html`
3. Paste into these sections:
   - **Confirm signup**
   - **Reset password** 
   - **Invite user**

4. Configure URLs in **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs (add all):
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000/auth/reset-password
     http://localhost:3000/auth/set-password
     ```

###Step 4: Test Email Authentication

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Try logging in with your admin Gmail
4. If no password set, use "Forgot Password" to set one
5. Verify you can access admin panel

✅ **Old authentication is now completely disabled!**

---

## PART 2: SETUP PUSH NOTIFICATIONS 🔔

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Name: **AAKB Worker Management**
4. Disable Google Analytics (or enable if you want)
5. Click "Create Project"

### Step 2: Add Web App to Firebase

1. In Firebase project → Click "Web" icon (</>) 
2. App nickname: **AAKB Web App**
3. ✅ Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"

5. Copy the configuration object shown

### Step 3: Get Firebase Keys

**3.1 - Get Web Config**
```javascript
// You'll see something like this - copy all values
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "aakb-....firebaseapp.com",
  projectId: "aakb-...",
  storageBucket: "aakb-....appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**3.2 - Get VAPID Key**
1. Project Settings → Cloud Messaging
2. Scroll to "Web Push certificates"
3. Click "Generate key pair"
4. Copy the key value

**3.3 - Get Service Account JSON**
1. Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file
4. Copy entire JSON content

### Step 4: Add Firebase Config to .env.local

Create/update `.env.local` with these values:

```env
# Supabase (already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase - Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aakb-....firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aakb-...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aakb-....appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# Firebase Admin SDK (paste entire JSON as one line)
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

### Step 5: Update Service Worker Config

1. Open `public/firebase-messaging-sw.js`
2. Replace placeholders with your Firebase config:
   ```javascript
   firebase.initializeApp({
       apiKey: "YOUR_API_KEY",  // From step 3
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       // ... etc
   });
   ```

### Step 6: Install Firebase Packages

```bash
npm install firebase firebase-admin
```

### Step 7: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 8: Test Push Notifications

1. Login to your app
2. Open browser console (F12)
3. You should see "FCM Token: ..." in console
4. Create a task assigned to yourself
5. Check if notification appears

---

## PART 3: VERIFICATION CHECKLIST ✅

### Authentication Security
- [ ] Old login with phone/PIN is completely disabled
- [ ] Can only login with Gmail + password
- [ ] Forgot password works
- [ ] Email templates look professional
- [ ] Middleware protects all routes
- [ ] Non-authorized emails cannot access

### Task Priorities
- [ ] Can create tasks with Medium/Important/Urgent
- [ ] Priority badges show correct colors (🟢🟡🔴)
- [ ] Can filter tasks by priority
- [ ] Priority sorting works

### Push Notifications
- [ ] Browser asks for notificationpermission
- [ ] FCM token saves to database
- [ ] Creating task sends notification
- [ ] Notification appears in browser
- [ ] Clicking notification opens app

---

## TROUBLESHOOTING 🔧

### "User still can login with old system"
- ✅ Run `supabase_remove_old_auth.sql` migration
- ✅ Check there's no `device_token` column in profiles table
- ✅ Restart dev server

### "Notifications not working"
- ✅ Check browser console for errors
- ✅ Verify all Firebase env variables are set
- ✅ Ensure VAPID key is correct
- ✅ Check if browser permission was granted
- ✅ Try in incognito mode (clear cache)

### "Email templates not showing"
- ✅ Copy from EMAIL_TEMPLATES.html exactly
- ✅ Save each template in Supabase dashboard
- ✅ Test with "Send test email" in Supabase

### "Middleware causing errors"
- ✅ Make sure `@supabase/ssr` package is installed
- ✅ Check middleware.ts syntax
- ✅ Verify Supabase cookies are working

---

## WHAT'S NEXT? 🎯

After completing setup:

1. **Add More Users**
   - Go to Admin → Authorized Users
   - Add team members
   - They'll receive invitation emails

2. **Test Task Notifications**
   - Create tasks with different priorities
   - Assign to different users
   - Verify notifications work

3. **Deploy to Production**
   - Update `.env` with production URLs
   - Add production redirect URLs to Supabase
   - Update service worker config
   - Configure custom SMTP for emails

4. **Mobile Apps** (Future)
   - Build Android/iOS apps
   - Configure FCM for mobile
   - Test on physical devices

---

## SUPPORT FILES REFERENCE 📁

- `supabase_remove_old_auth.sql` - Removes old auth system
- `supabase_sync_auth_profiles.sql` - Links auth with profiles
- `supabase_task_priorities_notifications.sql` - Adds priorities & notifications
- `EMAIL_TEMPLATES.html` - Professional email templates
- `PUSH_NOTIFICATIONS_SETUP.md` - Detailed Firebase setup guide
- `QUICK_START.md` - Quick setup reference

---

## NEED HELP? 💬

If you encounter any issues:
1. Check browser console (F12) for errors  
2. Review Supabase logs (Dashboard → Logs)
3. Verify all environment variables are set
4. Try in incognito/private browsing mode
5. Clear browser cache and localStorage

---

✅ = Required Step  
⚠️ = Important Warning  
🔔 = Notification Related  
🔐 = Security Related
