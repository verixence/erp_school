# Fee Reminder Cron Job Setup
 
## ✅ Automated Setup (pg_cron) - Already Done!

Your fee reminders are now **100% automated** using Supabase's built-in `pg_cron` extension (completely free).

### What's Running:

**Function:** `process_fee_reminders_daily()`
**Schedule:** Every day at 9:00 AM IST (3:30 AM UTC)
**What it does:**
1. Checks for reminders due today
2. Gets unpaid students for each reminder
3. Sends in-app notifications (web)
4. Queues push notifications (mobile)
5. Logs all sent reminders to avoid duplicates

### How to Monitor:

```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- View recent reminder logs
SELECT * FROM reminder_logs
ORDER BY sent_at DESC
LIMIT 20;

-- Check push notification queue
SELECT * FROM push_notification_queue
WHERE status = 'pending';
```

### How to Test:

```sql
-- Manually trigger the reminder processor
SELECT process_fee_reminders_daily();
```

### How to Change the Time:

```sql
-- Unschedule the old job
SELECT cron.unschedule('process-fee-reminders-daily');

-- Schedule at new time (example: 8 AM IST = 2:30 AM UTC)
SELECT cron.schedule(
  'process-fee-reminders-daily',
  '30 2 * * *',
  $$SELECT process_fee_reminders_daily()$$
);
```

### Cron Schedule Format:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `0 9 * * *` - Every day at 9:00 AM UTC
- `30 3 * * *` - Every day at 3:30 AM UTC (9:00 AM IST)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Every Monday at midnight

## 📱 Push Notifications

Push notifications are queued in the database and need to be sent by your backend. You have two options:

### Option 1: API Route (Recommended for Free Plan)
Call your API endpoint when processing the queue:

```bash
# Manually trigger push notification sending
curl -X POST https://your-app.vercel.app/api/admin/send-push-notifications
```

You can set up a free cron service to call this endpoint:
- **cron-job.org** (100% free, unlimited)
- **GitHub Actions** (free for public repos)

Example GitHub Action (`.github/workflows/process-push-notifications.yml`):
```yaml
name: Process Push Notifications
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Push Notification Processor
        run: |
          curl -X POST https://your-app.vercel.app/api/admin/send-push-notifications
```

### Option 2: Supabase Edge Function (Requires Supabase Pro)
If you upgrade to Supabase Pro, you can create an Edge Function that runs on a schedule.

## 🎯 Summary

✅ **Fee reminders** - Automated via `pg_cron` (FREE, already setup)
✅ **In-app notifications** - Sent immediately by pg_cron
⚠️ **Push notifications** - Queued, needs external trigger

For completely free operation:
1. Fee reminders run automatically (done!)
2. Set up free cron-job.org to call your push API every 15 minutes
3. That's it!

## 🔧 Troubleshooting

**Problem:** Reminders not sending
```sql
-- Check if pg_cron is enabled
SELECT * FROM cron.job;

-- Check for errors
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

**Problem:** No students getting reminders
```sql
-- Test the unpaid students function
SELECT * FROM get_unpaid_students_for_schedule('schedule-id-here');

-- Check if reminders are active
SELECT * FROM fee_schedule_reminders WHERE is_active = true;
```

**Problem:** Duplicate notifications
- The system automatically prevents duplicates within 24 hours
- Check `reminder_logs` table to verify
