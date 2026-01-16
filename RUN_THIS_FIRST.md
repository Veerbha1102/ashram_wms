# 🚨 CRITICAL: RUN THIS IMMEDIATELY

This fixes **CRITICAL SECURITY ERRORS** in your Supabase database.

## Problem
Your tables have security policies but **RLS is NOT ENABLED**, meaning:
- ❌ Anyone can access all data
- ❌ Policies are ignored
- ❌ No security enforcement

## Solution (2 Steps)

### Step 1: Enable RLS (URGENT)
Open **Supabase SQL Editor** and run:

```sql
-- File: supabase_enable_rls_all_tables.sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;
```

### Step 2: Apply Security Policies
Run this file: `supabase_complete_rls_security.sql`

This creates role-based policies for admin/manager/swamiji/worker.

## Verification

Run this to verify RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true` ✅

## Complete Setup Order

Run these files IN ORDER in Supabase SQL Editor:

1. ✅ `supabase_enable_rls_all_tables.sql` - Enable RLS (RUN FIRST!)
2. ✅ `FIX_DATABASE_NOW.sql` - Fix profiles table
3. ✅ `supabase_complete_rls_security.sql` - Apply security policies
4. ✅ `supabase_task_priorities_notifications.sql` - Add priorities & notifications

Done! Your database is now secure! 🔐
