# Push Notifications Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for Android and iOS push notifications.

## Prerequisites

- Firebase project (create one at https://console.firebase.google.com)
- Android device for testing (Android)
- Physical iOS device + Apple Developer account (iOS)

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Enter project name: **AAKB Worker Management**
4. Enable Google Analytics (optional)
5. Click "Create Project"

---

## Step 2: Add Firebase to Your App

### For Web/PWA

1. In Firebase Console → Project Overview → Add app → Web
2. Register app name: **AAKB Web**
3. Copy the Firebase config object
4. Add to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

5. Get VAPID key:
   - Project Settings → Cloud Messaging → Web Push certificates
   - Generate key pair
  - Copy the key value

---

## Step 3: Enable Cloud Messaging

1. In Firebase Console → Build → Cloud Messaging
2. If prompted, enable the API
3. Note: FCM is enabled by default for new projects

---

## Step 4: Get Service Account Key (for server-side)

1. Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file securely
4. Add to `.env.local`:

```env
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"..."}
```

> ⚠️ **NEVER commit this to Git!**

---

##Step 5: Install Required Packages

```bash
npm install firebase firebase-admin
```

---

## Step 6: Database Migration

Run this in Supabase SQL Editor:

```sql
-- Already created in supabase_task_priorities_notifications.sql
-- Creates: push_tokens, notifications, notification_settings tables
```

[View Migration](file:///C:/Users/Veer%20Bhanushali/OneDrive/Desktop/Ashram/Worker%20management%20sys/ashram-oms/supabase_task_priorities_notifications.sql)

---

## Step 7: Test Push Notifications

### Option A: Test from Firebase Console

1. Firebase Console → Engage → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Click "Send test message"
5. Enter your FCM token (get from browser console after implementing)

### Option B: Test from Your App

1. Implement the notification system (see implementation plan)
2. Create a task assigned to yourself
3. Check notification appears in browser/device

---

## For Android App

### Additional Steps:

1. Download `google-services.json` from Firebase Console
2. Place in `android/app/` directory
3. Add Firebase SDK to `android/build.gradle`
4. Request notification permission in AndroidManifest.xml

### Test on Android:

1. BuildAPK: `npm run build:android`
2. Install on device
3. Grant notification permission
4. Trigger notification event

---

## For iOS App

### Additional Steps:

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add to Xcode project
3. Enable Push Notifications capability in Xcode
4. Upload APNs certificate to Firebase:
   - Get APNs key from Apple Developer Account
   - Upload to Firebase Console → Project Settings → Cloud Messaging → iOS app

### Test on iOS:

1. Build IPA with Xcode
2. Install on physical iOS device (simulators don't support push)
3. Grant notification permission
4. Trigger notification event

---

## Notification Events (To Be Implemented)

The system will send notifications for:

| Event | Recipient | Message |
|-------|-----------|---------|
| Task Created | Assigned Worker | "New task assigned: {task_title}" |
| Task Completed | Admin/Manager | "{worker_name} completed: {task_title}" |
| Leave Requested | Admin/Manager | "{worker_name} requested leave for {dates}" |
| Leave Approved | Worker | "Your leave request has been approved" |
| Leave Rejected | Worker | "Your leave request was rejected: {reason}" |
| Urgent Task | Assigned Worker | "🔴 URGENT: {task_title}" |

---

## Troubleshooting

### Notifications not appearing?

1. ✅ Check browser/device has notification permission
2. ✅ Verify FCM token is saved in database
3. ✅ Check Firebase Console logs
4. ✅ Ensure service worker is registered (for web)

### Token registration failing?

1. ✅ Verify Firebase config is correct
2. ✅ Check VAPID key is valid (web)
3. ✅ Ensure HTTPS (required for web push)

### Server-side sending fails?

1. ✅ Verify service account JSON is valid
2. ✅ Check user has valid token in push_tokens table
3. ✅ Review server logs for errors

---

## Next Implementation Steps

1. ✅ Database schema (DONE)
2. ✅ Email templates (DONE)
3. ⏳ Firebase client setup (`src/lib/firebase.ts`)
4. ⏳ Notification API routes
5. ⏳ Service worker for background notifications
6. ⏳ Trigger notifications on events
7. ⏳ Notification settings page

---

## Security Best Practices

- ✅ Store server keys in `.env.local` only
- ✅ Use RLS to protect push_tokens table
- ✅ Validate user permissions before sending
- ✅ Don't expose sensitive data in notifications
- ✅ Allow users to opt-out via settings

---

## Reference Links

- [Firebase Console](https://console.firebase.google.com)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Android Push Guide](https://firebase.google.com/docs/cloud-messaging/android/client)
- [iOS Push Guide](https://firebase.google.com/docs/cloud-messaging/ios/client)
