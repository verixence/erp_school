# 🚀 Notification Sync System - Installation & Testing Guide

## ✅ What We've Built

A complete **Web → Mobile notification sync system** that automatically sends push notifications to mobile users when events occur on the web.

---

## 📦 Files Created/Modified

### 1. Database Migration
- **[db/migrations/notification_sync_system.sql](db/migrations/notification_sync_system.sql)**
  - Creates database triggers
  - Creates RPC functions for bulk notifications
  - Sets up automatic push notification queuing

### 2. Common Package Updates
- **[common/src/api/notifications.ts](common/src/api/notifications.ts)**
  - Added `createBulkNotifications()` - Main function for synced notifications
  - Added `sendPushToUsers()` - Send to specific users
  - Added `getUsersByAudience()` - Get users by role
  - Added helper functions for announcements, homework, exams

- **[common/src/api/community.ts](common/src/api/community.ts)**
  - Updated `createAnnouncement()` to auto-trigger push notifications

- **[common/src/api/index.ts](common/src/api/index.ts)**
  - Exported new notification functions

### 3. Mobile App
- **[mobile/erp-mobile/src/services/notifications.ts](mobile/erp-mobile/src/services/notifications.ts)**
  - Fixed: Disabled in-app notifications (only push now!)

---

## 🔧 Installation Steps

### Step 1: Run Database Migration

Connect to your Supabase database and run the migration:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Using psql
psql your_database_url < db/migrations/notification_sync_system.sql

# Option 3: Using Supabase Dashboard
# Copy the contents of notification_sync_system.sql
# Paste into SQL Editor in Supabase Dashboard
# Click "Run"
```

**Verify Installation:**
```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'queue_push_notification',
  'create_bulk_notifications_with_push',
  'send_push_to_users',
  'get_users_by_audience'
);

-- Should return 4 rows
```

### Step 2: Rebuild Common Package

```bash
cd common
npm run build

# Or if using pnpm
pnpm build
```

### Step 3: Restart Web & Mobile Apps

```bash
# Web app
cd web
npm run dev

# Mobile app
cd mobile/erp-mobile
npx expo start --clear
```

---

## 🧪 Testing the System

### Test 1: Create an Announcement (End-to-End Test)

1. **Open Web App** → Login as teacher/admin
2. **Navigate to** Announcements page
3. **Create new announcement**:
   - Title: "🎉 Test Push Notification"
   - Content: "This is a test of the mobile push notification system!"
   - Target Audience: "All"
   - Make sure "Published" is checked
4. **Click Create**

**What should happen:**
1. ✅ Web shows success toast
2. ✅ Announcement appears in web announcement list
3. ✅ Database trigger creates notifications in `notifications` table
4. ✅ Database trigger queues push in `push_notification_queue` table
5. ✅ Cron job processes queue and sends to Expo
6. ✅ Mobile users receive push notification

### Test 2: Check Database

```sql
-- Check notifications were created
SELECT count(*) FROM notifications
WHERE title = '🎉 Test Push Notification';

-- Check push notifications were queued
SELECT * FROM push_notification_queue
WHERE title = '🎉 Test Push Notification';

-- Check queue stats
SELECT * FROM notification_queue_stats;
```

### Test 3: Monitor Logs

**Web Console:**
```
✅ Announcement created successfully!
📲 Push notifications queued for announcement: 🎉 Test Push Notification
```

**Database Function Logs:**
```
NOTICE:  Queued push notification for user <uuid> with 1 tokens
```

**Mobile App (when notification received):**
- Should see system push notification
- Tap to open app
- Should navigate to announcement

---

## 📊 Monitoring Dashboard

### Check Queue Status

```typescript
import { getPushQueueStats } from '@erp/common';

const stats = await getPushQueueStats();
console.log(stats);
// Output:
// [
//   { status: 'pending', count: 5, oldest: '2025-01-01...', ... },
//   { status: 'sent', count: 150, ... },
//   { status: 'failed', count: 2, ... }
// ]
```

### Manual Push Notification

```typescript
import { sendPushToUsers } from '@erp/common';

// Send to specific users
await sendPushToUsers(
  ['user-id-1', 'user-id-2'],
  'Test Title',
  'Test Message',
  { screen: 'Dashboard' }
);
```

---

## 🔍 Troubleshooting

### Issue: No push notifications received

**Check 1: Are push tokens registered?**
```sql
SELECT count(*) FROM push_tokens WHERE is_active = true;
```

**Check 2: Are notifications being queued?**
```sql
SELECT * FROM push_notification_queue
ORDER BY created_at DESC LIMIT 10;
```

**Check 3: Is cron job running?**
- The API route `/api/admin/send-push-notifications` should be called periodically
- Check if there's a cron job or scheduled task

**Check 4: Mobile app configuration**
- Make sure push notifications are enabled in Settings
- Check app has notification permissions
- Verify push token was registered (check app logs)

### Issue: Trigger not firing

**Check trigger exists:**
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_notification_created';
```

**Test trigger manually:**
```sql
-- Insert a test notification
INSERT INTO notifications (
  school_id, user_id, title, message, type, is_read
) VALUES (
  'your-school-id',
  'your-user-id',
  'Test',
  'Test message',
  'system',
  false
);

-- Check if push was queued
SELECT * FROM push_notification_queue
WHERE title = 'Test'
ORDER BY created_at DESC LIMIT 1;
```

### Issue: Functions not found

**Reinstall migration:**
```sql
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
DROP FUNCTION IF EXISTS queue_push_notification();
DROP FUNCTION IF EXISTS create_bulk_notifications_with_push();
DROP FUNCTION IF EXISTS send_push_to_users();
DROP FUNCTION IF EXISTS get_users_by_audience();

-- Then re-run the migration file
```

---

## 🎯 Usage Examples

### Example 1: Announcement

```typescript
import { sendAnnouncementNotification } from '@erp/common';

await sendAnnouncementNotification(
  schoolId,
  '🏫 School Closed Tomorrow',
  'Due to weather conditions, school will be closed tomorrow.',
  'all', // or 'teachers', 'parents', 'students'
  announcementId
);
```

### Example 2: Homework

```typescript
import { sendHomeworkNotification } from '@erp/common';

await sendHomeworkNotification(
  schoolId,
  'Math Chapter 5',
  'Complete exercises 1-10 by Friday',
  'students', // or 'parents'
  homeworkId
);
```

### Example 3: Custom Notification

```typescript
import { createBulkNotifications } from '@erp/common';

const result = await createBulkNotifications(
  schoolId,
  'Custom Title',
  'Custom message...',
  'announcement',
  'all'
);

console.log(`Created ${result.notifications_created} notifications`);
console.log(`Queued ${result.push_notifications_queued} push notifications`);
```

---

## 📈 Performance Considerations

### Database Indexes
The migration creates these indexes automatically:
- `idx_push_tokens_user_active` - Fast token lookup
- `idx_push_queue_status_created` - Efficient queue processing
- `idx_notifications_user_unread` - Quick unread count

### Queue Processing
- Push notifications are batched (100 per request)
- Failed deliveries retry up to 3 times
- Old completed notifications should be cleaned up periodically

### Recommended Cron Schedule
```
*/5 * * * * - Process push queue every 5 minutes
```

Or use a service like:
- **Vercel Cron** (if using Vercel)
- **GitHub Actions** (scheduled workflows)
- **External cron service** (cron-job.org)

---

## ✅ Success Checklist

- [ ] Database migration ran successfully
- [ ] Functions created (`SELECT * FROM information_schema.routines`)
- [ ] Trigger created (`SELECT * FROM information_schema.triggers`)
- [ ] Common package rebuilt and deployed
- [ ] Web app restarted
- [ ] Mobile app restarted
- [ ] Test announcement created
- [ ] Push notification received on mobile
- [ ] No errors in logs
- [ ] Queue stats show activity

---

## 🚀 Next Steps

1. **Add more event types:**
   - Homework creation
   - Marks uploaded
   - Exam scheduled
   - Fee payment reminders
   - Attendance alerts

2. **User preferences:**
   - Allow users to customize which notifications they receive
   - Quiet hours (don't send at night)
   - Notification frequency settings

3. **Rich notifications:**
   - Add images to push notifications
   - Add action buttons
   - Deep linking to specific screens

4. **Analytics:**
   - Track notification delivery rates
   - Monitor user engagement
   - A/B test notification content

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review database logs for NOTICE messages
3. Check web console for notification function logs
4. Verify mobile app is receiving push token
5. Test with manual SQL inserts to isolate the issue

**Remember**: The system has multiple layers (DB trigger → Queue → Cron → Expo → Device), so test each layer independently!

---

## 🎉 You're Done!

Your notification sync system is now live! Every time someone creates an announcement, homework, or other event on the web, mobile users will automatically receive push notifications. No more manual notification sending needed! 🚀
