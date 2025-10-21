# 🔔 Notification Sync Solution: Web ↔️ Mobile

## Problem Statement

Currently, the web app and mobile app have **separate notification systems** that don't communicate:

- **Web**: Uses toast messages (`sonner`) + in-app notification bell (`notifications` table)
- **Mobile**: Uses push notifications (`push_notification_queue` + `push_tokens` tables)

**Result**: When a teacher creates an announcement on web, mobile users don't get push notifications!

---

## Architecture Overview

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   Web App   │          │   Database   │          │  Mobile App │
│             │          │              │          │             │
│  Toast      │───┐      │              │      ┌───│   Push      │
│  Sonner     │   │      │              │      │   │   Notif.    │
│             │   └────► │notifications │      │   │             │
│             │          │    table     │      │   │             │
└─────────────┘          │              │      │   └─────────────┘
                         │              │      │
                         │ DB Trigger   │      │
                         │   ↓          │      │
                         │push_notif    │──────┘
                         │_queue table  │
                         │              │
                         └──────────────┘
```

---

## Solution: Database Triggers + Queue System

### Step 1: Create Database Trigger

When a notification is created in the `notifications` table, automatically queue a push notification:

```sql
-- Function to queue push notifications
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get push tokens for the user
  INSERT INTO push_notification_queue (
    tokens,
    title,
    body,
    data,
    status,
    attempts
  )
  SELECT
    ARRAY_AGG(token),
    NEW.title,
    NEW.message,
    jsonb_build_object(
      'notification_id', NEW.id::text,
      'type', NEW.type,
      'related_id', NEW.related_id
    ),
    'pending',
    0
  FROM push_tokens
  WHERE user_id = NEW.user_id
    AND is_active = TRUE
  GROUP BY user_id
  HAVING COUNT(*) > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();
```

### Step 2: Enhance Common Functions

Update `createNotification` to also work for mobile:

```typescript
// common/src/api/notifications.ts

export const createNotification = async (
  notificationData: CreateNotificationData
): Promise<Notification> => {
  // Create in-app notification
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

  if (error) throw error;

  // Database trigger will automatically queue push notification
  // for mobile users with active push tokens

  return data;
};
```

### Step 3: Add Bulk Notification Support

For announcements that target multiple users:

```typescript
// common/src/api/notifications.ts

export const createBulkNotifications = async (
  schoolId: string,
  title: string,
  message: string,
  targetAudience: 'all' | 'teachers' | 'parents' | 'students',
  type: 'announcement' | 'post' | 'system',
  relatedId?: string
): Promise<void> => {
  // Get target users
  const { data: users } = await supabase
    .rpc('get_users_by_audience', {
      p_school_id: schoolId,
      p_audience: targetAudience
    });

  if (!users || users.length === 0) return;

  // Create in-app notifications for all users
  const notifications = users.map(user => ({
    school_id: schoolId,
    user_id: user.id,
    title,
    message,
    type,
    related_id: relatedId,
    is_read: false
  }));

  await supabase.from('notifications').insert(notifications);

  // Database trigger will queue push notifications automatically
};
```

---

## Event-to-Notification Mapping

Here's when notifications should be triggered:

| Event | Web | Mobile | Priority |
|-------|-----|--------|----------|
| **Announcement Created** | Toast | Push | High |
| **New Homework** | Toast | Push | High |
| **Marks Uploaded** | Toast | Push | High |
| **Attendance Marked** | Toast | Push | Normal |
| **New Event** | Toast | Push | Normal |
| **Exam Scheduled** | Toast | Push | High |
| **Fee Due** | Toast | Push | High |
| **Leave Approved/Rejected** | Toast | Push | Normal |
| **New Community Post** | Bell Only | Push | Low |
| **Message Received** | Toast | Push | High |

---

## Implementation Checklist

### Database Changes

- [ ] Create `queue_push_notification()` function
- [ ] Create trigger on `notifications` table
- [ ] Create `get_users_by_audience()` RPC function
- [ ] Add indexes for performance

### Common Package Updates

- [ ] Add `createBulkNotifications()` function
- [ ] Update announcement creation to use bulk notifications
- [ ] Update homework creation to trigger notifications
- [ ] Update marks entry to trigger notifications
- [ ] Update exam scheduling to trigger notifications

### Web App Updates

- [ ] Update announcement page to trigger notifications
- [ ] Update homework creation to trigger notifications
- [ ] Update marks entry to trigger notifications
- [ ] Update exam creation to trigger notifications
- [ ] Add notification preferences UI

### Mobile App Updates

- [ ] Already done! ✅ Push notifications configured
- [ ] Handle notification taps (deep linking)
- [ ] Add notification preferences

### Backend/Cron Jobs

- [ ] Create cron job to process `push_notification_queue`
- [ ] Run every 1-5 minutes
- [ ] Handle failed deliveries
- [ ] Clean up old notifications

---

## Quick Fix: Manual Push Notification Function

Until triggers are set up, use this helper function:

```typescript
// common/src/api/pushNotifications.ts

import { supabase } from './supabase';

export const sendPushNotificationToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  // Get tokens for users
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) return;

  // Queue push notification
  await supabase
    .from('push_notification_queue')
    .insert({
      tokens: tokens.map(t => t.token),
      title,
      body,
      data: data || {},
      status: 'pending',
      attempts: 0
    });
};

// Use in announcement creation:
await createBulkNotifications(...);
await sendPushNotificationToUsers(userIds, title, message);
```

---

## Testing Plan

1. **Create Announcement on Web**
   - ✅ Shows toast on web
   - ✅ Appears in notification bell
   - ✅ Queues push notification
   - ✅ Mobile user receives push

2. **Create Homework on Web**
   - ✅ Shows toast
   - ✅ Students get push notification

3. **Upload Marks on Web**
   - ✅ Shows toast
   - ✅ Students/parents get push notification

4. **User Preferences**
   - ✅ User can disable specific notification types
   - ✅ Preferences respected for both web + mobile

---

## Priority Recommendation

**IMMEDIATE** (This Week):
1. ✅ Fix mobile push notification behavior (DONE!)
2. Create database trigger for automatic queuing
3. Add `createBulkNotifications()` function
4. Update announcement creation to use it

**SHORT TERM** (Next 2 Weeks):
1. Update all major features (homework, marks, exams)
2. Set up cron job for processing queue
3. Add deep linking on mobile

**LONG TERM** (Next Month):
1. Notification preferences UI
2. Analytics dashboard
3. Push notification scheduling
4. Rich notifications (images, actions)

---

## Current Status

✅ **Fixed**: Mobile in-app notifications disabled
✅ **Fixed**: Push notifications configured
❌ **Missing**: Auto-sync between web events and mobile push
❌ **Missing**: Database triggers
❌ **Missing**: Bulk notification helpers

**Next Step**: Implement database trigger + update announcement creation!

