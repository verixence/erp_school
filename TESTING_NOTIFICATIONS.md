# Testing Payment Schedule Notifications

## Overview
The payment schedule notification system sends automated reminders to parents about upcoming fee payments. This guide shows you how to test it.

## Prerequisites
1. A payment schedule must be created in the system
2. Students must be assigned to the grades in the payment schedule
3. Students must have parents assigned (with user accounts)

## Testing Methods

### Method 1: Manual SQL Trigger (Immediate Testing)

This method lets you trigger the notification function manually to see immediate results.

**Step 1: Run the reminder processor function**
```sql
SELECT process_fee_reminders_daily();
```

**Step 2: Check if notifications were created**
```sql
SELECT
  n.id,
  n.title,
  n.message,
  n.created_at,
  u.email as parent_email,
  s.full_name as student_name
FROM notifications n
JOIN users u ON u.id = n.user_id
LEFT JOIN students s ON s.parent_id = u.id
WHERE n.type = 'fee_reminder'
ORDER BY n.created_at DESC
LIMIT 10;
```

**Step 3: Check reminder logs**
```sql
SELECT
  rl.id,
  rl.reminder_sent_at,
  rl.student_count,
  rl.notification_count,
  fcs.schedule_name,
  fcs.due_date
FROM reminder_logs rl
JOIN fee_collection_schedules fcs ON fcs.id = rl.schedule_id
ORDER BY rl.reminder_sent_at DESC
LIMIT 10;
```

### Method 2: Adjust Due Date (Quick Testing)

Create a test payment schedule with a due date very close to today to trigger reminders.

**Example:**
1. Go to Finance & Accounting → Settings → Payment Schedule
2. Click "New Schedule"
3. Set:
   - Schedule Name: "Test Reminder Schedule"
   - Academic Year: 2025-2026
   - Due Date: **Tomorrow's date** (this will trigger "1 day before" reminder)
   - Select some grades and fee types
   - Keep default reminders enabled
4. Save the schedule
5. Wait a few minutes or manually trigger: `SELECT process_fee_reminders_daily();`

### Method 3: Check Cron Job Status

Verify the automated cron job is running:

```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'process-fee-reminders-daily';

-- Check cron job run history
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'process-fee-reminders-daily')
ORDER BY start_time DESC
LIMIT 10;
```

## Testing In-App Notifications (Web)

### Step 1: Create a test payment schedule
1. Navigate to `/school-admin/fees`
2. Go to Settings → Payment Schedule
3. Create a schedule with due date = tomorrow

### Step 2: Trigger the reminder processor
Run this in Supabase SQL Editor:
```sql
SELECT process_fee_reminders_daily();
```

### Step 3: Check notifications
1. Log in as a **parent** user (not admin)
2. Look at the notification bell icon in the top right
3. You should see a notification like:
   - Title: "Fee Payment Reminder"
   - Message: "Your payment of ₹[amount] for [fee types] is due on [date]. Please make the payment to avoid late fees."

### Step 4: Verify notification details
Click on the notification to see:
- Related entity type: `fee_schedule`
- Related entity ID: (the schedule ID)
- Metadata includes student info and amount

## Testing Push Notifications (Mobile)

### Prerequisites
1. Mobile app must be running on a device/emulator
2. User must have granted notification permissions
3. User's `expo_push_token` must be stored in the `users` table

### Step 1: Verify push token exists
```sql
SELECT id, email, expo_push_token
FROM users
WHERE expo_push_token IS NOT NULL
LIMIT 5;
```

### Step 2: Check push notification queue
After triggering reminders, check if push notifications were queued:
```sql
SELECT
  id,
  tokens,
  title,
  body,
  data,
  status,
  created_at
FROM push_notification_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

### Step 3: Process push notifications
The push notifications need to be sent via an external service (Expo Push Notification Service).

**Option A: Manual Processing** (for testing)
You can create a simple script to process the queue, or use the existing API:
```bash
curl -X POST http://localhost:3001/api/admin/notifications/send-push \
  -H "Content-Type: application/json"
```

**Option B: Setup External Cron** (for production)
Use a service like cron-job.org to hit the push notification endpoint every hour:
- URL: `https://your-domain.com/api/admin/notifications/send-push`
- Frequency: Every 1 hour

## Monitoring & Debugging

### Check for errors
```sql
-- Check reminder logs for failures
SELECT * FROM reminder_logs
WHERE status = 'failed'
ORDER BY reminder_sent_at DESC;

-- Check notification creation
SELECT COUNT(*) as total_notifications,
       type,
       created_at::date as notification_date
FROM notifications
WHERE type = 'fee_reminder'
GROUP BY type, created_at::date
ORDER BY notification_date DESC;
```

### Check which students are unpaid
```sql
SELECT
  s.id,
  s.full_name,
  s.grade,
  s.admission_no,
  u.email as parent_email,
  u.expo_push_token IS NOT NULL as has_push_token
FROM students s
LEFT JOIN users u ON u.id = s.parent_id
WHERE s.school_id = 'YOUR_SCHOOL_ID'
  AND s.status = 'active'
  AND s.grade = 'NURSERY'  -- or any grade in your payment schedule
LIMIT 10;
```

### Check if reminders are due today
```sql
SELECT * FROM get_reminders_due_today();
```

## Expected Behavior

### Reminder Timeline Example
If a payment schedule has due date = **March 15, 2025**:

- **March 8** (7 days before): Send "7 days before due" reminder
- **March 14** (1 day before): Send "1 day before due" reminder
- **March 15** (on due date): Send "on due date" reminder
- **March 18** (3 days after): Send "3 days after due" reminder

### Duplicate Prevention
- Each reminder type is sent only ONCE per schedule per student
- The system checks `reminder_logs` table to prevent duplicates
- If a reminder was sent within the last 24 hours, it won't be sent again

## Troubleshooting

### No notifications appearing?

**Check 1: Is the schedule active?**
```sql
SELECT * FROM fee_collection_schedules
WHERE status = 'active'
ORDER BY created_at DESC;
```

**Check 2: Are there students in the selected grades?**
```sql
SELECT COUNT(*)
FROM students
WHERE grade IN (
  SELECT grade FROM fee_schedule_grades WHERE schedule_id = 'YOUR_SCHEDULE_ID'
);
```

**Check 3: Do students have parents assigned?**
```sql
SELECT COUNT(*)
FROM students
WHERE grade = 'NURSERY'
  AND parent_id IS NOT NULL;
```

**Check 4: Are reminders enabled?**
```sql
SELECT * FROM fee_schedule_reminders
WHERE schedule_id = 'YOUR_SCHEDULE_ID'
  AND is_active = true;
```

### Notifications created but not visible in UI?

**Check 1: Is the user logged in as a parent?**
Only parent users receive fee reminders, not admins.

**Check 2: Check notification permissions**
```sql
SELECT * FROM notifications
WHERE user_id = 'PARENT_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

## Manual Testing Script

Here's a complete SQL script to test everything at once:

```sql
-- 1. Enable cron (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Manually trigger the reminder processor
SELECT process_fee_reminders_daily();

-- 3. Check results
SELECT
  'Schedules Active' as check_name,
  COUNT(*) as count
FROM fee_collection_schedules
WHERE status = 'active'

UNION ALL

SELECT
  'Reminders Sent Today' as check_name,
  COUNT(*) as count
FROM reminder_logs
WHERE reminder_sent_at::date = CURRENT_DATE

UNION ALL

SELECT
  'Notifications Created Today' as check_name,
  COUNT(*) as count
FROM notifications
WHERE created_at::date = CURRENT_DATE
  AND type = 'fee_reminder'

UNION ALL

SELECT
  'Push Notifications Queued' as check_name,
  COUNT(*) as count
FROM push_notification_queue
WHERE status = 'pending';
```

## Next Steps

Once you've verified notifications work:
1. ✅ Create real payment schedules for each term/semester
2. ✅ Ensure all students have parent accounts assigned
3. ✅ Set up external cron for push notification processing (optional)
4. ✅ Monitor the `reminder_logs` table to ensure reminders are being sent
5. ✅ Adjust reminder timing based on your school's needs

## Support

If you encounter issues:
1. Check the `reminder_logs` table for error messages
2. Verify the cron job is running with `SELECT * FROM cron.job_run_details`
3. Check Supabase logs for any errors
4. Ensure all required tables exist (run the migration again if needed)
