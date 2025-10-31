# 🔧 Fix: Notification System Error

## The Problem

You're seeing this error:
```
Error creating bulk notifications: {}
Failed to queue push notifications: {}
```

**Root Cause:** The database functions required for the notification system haven't been applied to your database yet.

---

## 🚀 Quick Fix (Choose One Method)

### Method 1: Using Supabase Dashboard (Recommended - Easiest)

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Copy & Run the Migration**
   - Open the file: `db/migrations/notification_sync_system.sql`
   - Copy ALL the contents (267 lines)
   - Paste into the SQL Editor
   - Click **"Run"** button

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Run this query to verify:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN (
     'create_bulk_notifications_with_push',
     'send_push_to_users',
     'get_users_by_audience',
     'queue_push_notification'
   );
   ```
   - Should return 4 rows

5. **Restart your app**
   ```bash
   # In the web directory
   npm run dev
   ```

---

### Method 2: Using the Script (If you have Supabase CLI)

```bash
# Set your database URL
export DATABASE_URL="your_supabase_database_url"

# Run the migration script
./apply-notification-migration.sh
```

---

### Method 3: Using psql (Advanced)

```bash
psql YOUR_DATABASE_URL < db/migrations/notification_sync_system.sql
```

---

## ✅ Test the Fix

1. **Create an announcement:**
   - Go to School Admin → Announcements
   - Click "Create Announcement"
   - Fill in title and content
   - Select target audience (e.g., "All")
   - Click "Create"

2. **Check for success:**
   - You should see: ✅ "Announcement created successfully"
   - NO MORE errors about "Error creating bulk notifications"

3. **Verify in database** (optional):
   ```sql
   -- Check notifications were created
   SELECT count(*) FROM notifications
   WHERE type = 'announcement'
   AND created_at > NOW() - INTERVAL '1 minute';
   
   -- Check push notifications were queued
   SELECT count(*) FROM push_notification_queue
   WHERE status = 'pending';
   ```

---

## 📋 What This Migration Does

The migration creates:

1. **Database Functions:**
   - `create_bulk_notifications_with_push()` - Main function for sending notifications
   - `send_push_to_users()` - Send to specific users
   - `get_users_by_audience()` - Get users by role (teachers/parents/students)
   - `queue_push_notification()` - Trigger function

2. **Database Trigger:**
   - Automatically queues push notifications when in-app notifications are created

3. **Indexes:**
   - Performance optimizations for fast notification delivery

4. **Monitoring View:**
   - `notification_queue_stats` - Monitor notification queue status

---

## 🆘 Still Having Issues?

### Check 1: Verify tables exist
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('notifications', 'push_notification_queue', 'push_tokens');
```

All 3 tables should exist.

### Check 2: Check for migration errors
If you got an error when running the migration, look for:
- Missing tables (run earlier migrations first)
- Permission issues (make sure you're using the correct database connection)

### Check 3: Database connection
Make sure your `.env.local` has the correct Supabase connection details.

---

## 🎉 Success!

Once the migration is applied, your notification system will work automatically:
- ✅ Announcements → Push notifications
- ✅ Homework → Push notifications
- ✅ Exams → Push notifications
- ✅ Fee reminders → Push notifications

All handled automatically! 🚀

