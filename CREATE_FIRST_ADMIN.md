# 🔐 Create First Admin User - Step by Step

## Step 1: Create User in Supabase Auth ✅ (You're here!)

1. Go to: https://supabase.com/dashboard/project/glzpnlzpmqlgpobgehkw/auth/users
2. Click **"Create a new user"**  
3. **Email**: `veer.bhanushali@aakb.org.in` (or your admin email)
4. **Password**: Set a strong password
5. ✅ Check **"Auto Confirm User?"**
6. Click **"Create user"**
7. **Copy the User ID** (UUID) that appears

---

## Step 2: Add to Authorized Users Table

1. Go to **SQL Editor**: https://supabase.com/dashboard/project/glzpnlzpmqlgpobgehkw/sql/new
2. **Paste this SQL** (replace `USER_ID_HERE` and email):

```sql
-- Add first admin user
INSERT INTO authorized_users (id, gmail, full_name, role, is_active)
VALUES (
    'USER_ID_HERE',  -- Replace with the UUID from Step 1
    'veer.bhanushali@aakb.org.in',  -- Your email
    'Veer Bhanushali',
    'admin',
    true
);
```

3. Click **"Run"**

---

## Step 3: Create Profile

```sql
-- Create profile for admin
INSERT INTO profiles (id, gmail, name, role, phone, is_active)
VALUES (
    'USER_ID_HERE',  -- Same UUID
    'veer.bhanushali@aakb.org.in',
    'Veer Bhanushali',
    'admin',
    'veer.bhanushali@aakb.org.in',  -- Can use email as phone for now
    true
);
```

---

## Step 4: Login to Your App! 🎉

1. Go to: `http://localhost:3000/login`
2. Email: `veer.bhanushali@aakb.org.in`
3. Password: (what you set in Step 1)
4. **You're now admin!** ✨

---

## Now You Can:
- Add more users from admin panel
- Manage tasks, attendance, etc.
- No more manual SQL needed!

---

## Troubleshooting

**"Invalid login credentials"**  
→ Make sure the email matches exactly in both `authorized_users` and Supabase Auth

**"Not authorized"**  
→ Check `authorized_users` has `is_active = true` and `role = 'admin'`
