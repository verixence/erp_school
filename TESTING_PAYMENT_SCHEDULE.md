# 🧪 Testing Payment Schedule System

## ✅ Quick Test Guide

### Step 1: Access the UI

1. Go to your app: `localhost:3000/school-admin/fees`
2. Click **Settings** tab
3. Click **Payment Schedule** tab (new!)
4. You should see the Payment Schedule Management interface

---

### Step 2: Create a Test Schedule

1. Click **"New Schedule"** button
2. Fill in the form:
   - **Schedule Name:** `Test Schedule - January 2025`
   - **Academic Year:** Select current year
   - **Description:** `Testing automated reminders`
   - **Due Date:** Select tomorrow's date (to test reminders quickly!)
   - **Grace Period:** `5` days
3. **Select Grades:** Click on `NURSERY`, `LKG`, or any available grades
4. **Select Fee Types:** Check `Tuition Fee`, `Books Fee`, etc.
5. **Reminders:** You'll see 4 preset reminders:
   - ✅ 7 days before due date
   - ✅ 1 day before due date (this will trigger if due date is tomorrow!)
   - ✅ On due date
   - ✅ 3 days after due date (overdue)
6. Click **"Create Schedule"**
7. You should see success message!

---

### Step 3: Manually Trigger Reminders (Test Immediately)

Open Supabase SQL Editor and run:

```sql
-- This will process reminders as if it's the scheduled time
SELECT process_fee_reminders_daily();
```

Expected output: `()` (empty result means it ran successfully)

---

### Step 4: Verify Reminders Were Sent

#### Check In-App Notifications:
```sql
SELECT
  title,
  message,
  type,
  created_at,
  is_read
FROM notifications
WHERE type = 'fee_reminder'
ORDER BY created_at DESC
LIMIT 10;
```

#### Check Push Notification Queue:
```sql
SELECT
  title,
  body,
  status,
  attempts,
  created_at
FROM push_notification_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

#### Check Reminder Logs:
```sql
SELECT
  rl.*,
  u.email as parent_email,
  s.full_name as student_name
FROM reminder_logs rl
JOIN users u ON u.id = rl.user_id
JOIN students s ON s.id = rl.student_id
ORDER BY rl.sent_at DESC
LIMIT 10;
```

---

### Step 5: Test Web Notification

1. As a **parent user**, log in to the web app
2. Look at the **notification bell** icon in the top right
3. You should see a badge with unread count
4. Click the bell to see the fee reminder notification
5. Click the notification - it should navigate to fees page

---

### Step 6: Verify Automated Cron

Check that the cron job is scheduled:

```sql
SELECT
  jobname,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE jobname = 'process-fee-reminders-daily';
```

Expected result:
- **jobname:** `process-fee-reminders-daily`
- **schedule:** `30 3 * * *` (9:00 AM IST)
- **active:** `t` (true)

Check recent cron runs:
```sql
SELECT
  jobid,
  runid,
  status,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'process-fee-reminders-daily'
)
ORDER BY start_time DESC
LIMIT 5;
```

---

### Step 7: Test Different Reminder Types

#### Test "1 Day Before" Reminder:
```sql
-- Create a schedule with due date tomorrow
INSERT INTO fee_collection_schedules (
  school_id,
  schedule_name,
  academic_year,
  due_date,
  status
) VALUES (
  'your-school-id',
  'Tomorrow Test',
  '2025-2026',
  CURRENT_DATE + 1, -- Tomorrow
  'active'
);

-- Run the processor
SELECT process_fee_reminders_daily();
```

#### Test "On Due Date" Reminder:
```sql
-- Create a schedule with due date today
UPDATE fee_collection_schedules
SET due_date = CURRENT_DATE
WHERE schedule_name = 'Tomorrow Test';

-- Run the processor
SELECT process_fee_reminders_daily();
```

#### Test "Overdue" Reminder:
```sql
-- Create a schedule with due date 3 days ago
UPDATE fee_collection_schedules
SET due_date = CURRENT_DATE - 3
WHERE schedule_name = 'Tomorrow Test';

-- Run the processor
SELECT process_fee_reminders_daily();
```

---

## 🔍 Troubleshooting

### No Reminders Sent?

**Check 1:** Verify schedule is active
```sql
SELECT * FROM fee_collection_schedules
WHERE status = 'active';
```

**Check 2:** Verify reminders are active
```sql
SELECT * FROM fee_schedule_reminders
WHERE is_active = true;
```

**Check 3:** Verify grades are added
```sql
SELECT
  fcs.schedule_name,
  fsg.grade
FROM fee_collection_schedules fcs
JOIN fee_schedule_grades fsg ON fsg.schedule_id = fcs.id;
```

**Check 4:** Verify students exist in those grades
```sql
SELECT
  COUNT(*) as student_count,
  grade
FROM students
WHERE status = 'active'
  AND school_id = 'your-school-id'
GROUP BY grade;
```

**Check 5:** Verify students have parents
```sql
SELECT
  s.full_name,
  s.grade,
  u.email as parent_email
FROM students s
LEFT JOIN users u ON u.id = s.parent_id
WHERE s.status = 'active'
  AND s.school_id = 'your-school-id'
LIMIT 10;
```

### Duplicate Notifications?

The system automatically prevents duplicates within 24 hours:
```sql
-- Check if already sent
SELECT * FROM reminder_logs
WHERE student_id = 'student-id'
  AND reminder_id = 'reminder-id'
  AND sent_at > NOW() - INTERVAL '24 hours';
```

### Cron Not Running?

```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check cron logs
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

---

## 📊 Performance Check

### Count Total Schedules:
```sql
SELECT
  status,
  COUNT(*) as count
FROM fee_collection_schedules
GROUP BY status;
```

### Count Total Reminders Sent:
```sql
SELECT
  DATE(sent_at) as date,
  COUNT(*) as reminders_sent,
  COUNT(DISTINCT student_id) as students_notified
FROM reminder_logs
GROUP BY DATE(sent_at)
ORDER BY date DESC
LIMIT 7;
```

### Average Processing Time:
```sql
SELECT
  DATE(start_time) as date,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_seconds
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'process-fee-reminders-daily'
)
GROUP BY DATE(start_time)
ORDER BY date DESC
LIMIT 7;
```

---

## 🎯 Success Checklist

- ✅ UI loads without errors
- ✅ Can create new payment schedule
- ✅ Schedule appears in list
- ✅ Can edit existing schedule
- ✅ Can view schedule details
- ✅ Can delete schedule
- ✅ Manual trigger sends notifications
- ✅ Notifications appear in database
- ✅ Parents see notifications in bell icon
- ✅ Cron job is scheduled
- ✅ No duplicate notifications sent

---

## 📱 Setup Push Notifications (Optional)

For mobile push to actually send, you need to trigger the processor:

### Option 1: Manual Testing
```bash
curl -X POST http://localhost:3000/api/admin/send-push-notifications
```

### Option 2: Free Automated (cron-job.org)
1. Go to https://cron-job.org
2. Sign up (free)
3. Create new job:
   - **Title:** Process Push Notifications
   - **URL:** `https://your-app.vercel.app/api/admin/send-push-notifications`
   - **Schedule:** Every 15 minutes
   - **Method:** POST
4. Save and activate

---

## 🎉 You're Done!

Your payment schedule system is now fully operational and will automatically:
- Send reminders 7 days before due date
- Send reminders 1 day before due date
- Send reminders on due date
- Send overdue reminders 3 days after
- Prevent duplicate notifications
- Log all activity

Parents will receive notifications on both web and mobile (if you set up push processing).
