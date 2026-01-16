# Role-Based Security Matrix

## Permission Summary

| Table | Admin | Manager | Swamiji | Worker |
|-------|-------|---------|---------|--------|
| **Profiles** | ✅ Full | ✅ Full | 📖 View All | 📖 View All<br>✏️ Edit Own |
| **Tasks** | ✅ Full | ✅ Full | 📖 View All | 📖 View Own<br>✏️ Update Own Status |
| **Attendance** | ✅ Full | ✅ Full | 📖 View All | 📖 View Own<br>➕ Mark Own |
| **Leaves** | ✅ Full | ✅ Full | ❌ No Access | 📖 View Own<br>➕ Request<br>✏️ Edit Pending |
| **Holidays** | ✅ Full | ✅ Full | 📖 View All | 📖 View All |
| **Settings** | ✅ Full | ❌ View Only | ❌ View Only | ❌ View Only |
| **Activity Log** | 📖 View All | 📖 View All | ❌ No Access | ❌ No Access |
| **Authorized Users** | ✅ Full | ❌ View All | ❌ No Access | ❌ No Access |
| **Notifications** | 📖 View Own<br>✏️ Edit Own | 📖 View Own<br>✏️ Edit Own | 📖 View Own<br>✏️ Edit Own | 📖 View Own<br>✏️ Edit Own |

**Legend:**
- ✅ Full = Create, Read, Update, Delete
- 📖 View = Read-only access
- ➕ = Can create
- ✏️ = Can update
- ❌ = No access
- "Own" = Only their own records

## Detailed Permissions

### Admin
**Full system control**
- ✅ Manage all workers
- ✅ Create/edit/delete tasks
- ✅ Approve/reject leave requests
- ✅ Manage holidays
- ✅ Modify system settings
- ✅ View activity logs
- ✅ Manage authorized users

### Manager
**Same as Admin except:**
- ✅ Manage workers and operations
- ✅ Handle day-to-day tasks
- ❌ Cannot modify system settings
- ❌ Cannot manage authorized users (can only view)

### Swamiji
**Read-only monitoring**
- 📖 View all workers
- 📖 View all attendance
- 📖 View all tasks
- 📖 View holidays
- ❌ Cannot modify anything except own notifications

### Worker
**Limited to own data**
- 📖 View own profile, can edit basic info
- 📖 View own tasks
- ✏️ Update own task status (mark complete)
- ➕ Mark own attendance
- 📖 View own attendance history
- ➕ Request leave
- 📖 View own leave requests
- ✏️ Edit own pending leave requests
- 📖 View holidays
- ❌ Cannot access other workers' data

## Security Implementation

All policies are enforced at the **database level** using PostgreSQL Row Level Security (RLS).

### How It Works

1. **User Authentication**
   - User logs in with Gmail
   - Supabase Auth validates credentials
   - User role is fetched from `authorized_users` table

2. **Request Authorization**
   - Every database query automatically checks RLS policies
   - Policies verify user's role and permissions
   - Database returns only allowed data

3. **Automatic Enforcement**
   - Even if frontend is bypassed, database blocks unauthorized access
   - No way to access data without proper role
   - All actions are logged in `activity_log`

## Security Features

✅ **Database-level enforcement** (cannot be bypassed)
✅ **Role verification on every query**
✅ **Automatic data filtering based on role**
✅ **Activity logging for audit trail**
✅ **Session-based authentication**
✅ **No direct database credentials exposed**

## Testing Security

Run these tests after applying RLS policies:

### Test 1: Worker Cannot See Other Tasks
```sql
-- Login as worker
-- Should only see their own tasks
SELECT * FROM tasks;
```

### Test 2: Worker Cannot Delete Attendance
```sql
-- Login as worker
-- Should fail
DELETE FROM attendance WHERE id = 'some-id';
```

### Test 3: Swamiji Cannot Approve Leave
```sql
-- Login as swamiji
-- Should fail
UPDATE leaves SET status = 'approved' WHERE id = 'some-id';
```

### Test 4: Manager Can Manage Tasks
```sql
-- Login as manager
-- Should work
INSERT INTO tasks (title, assigned_to, priority) 
VALUES ('Test Task', 'worker-id', 'medium');
```

## Apply Security

Run this file in Supabase SQL Editor:
`supabase_complete_rls_security.sql`

This will:
1. Create role-checking helper function
2. Drop old policies
3. Create new comprehensive RLS policies
4. Enable RLS on all tables
5. Verify policies are active
