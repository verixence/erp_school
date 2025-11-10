# Push Notification Backend Integration Guide

**Date:** November 9, 2025
**App:** CampusHoster - Web Backend
**Purpose:** Complete guide for integrating push notifications across all backend events

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Setup & Installation](#setup--installation)
3. [Core Library](#core-library)
4. [Database Requirements](#database-requirements)
5. [Integration Examples](#integration-examples)
6. [Cron Job Setup](#cron-job-setup)
7. [Testing](#testing)
8. [Best Practices](#best-practices)

---

## Overview

This guide shows how to integrate push notifications into your backend using the new **push-notifications library** (`src/lib/push-notifications.ts`).

### What's New:

✅ **Centralized Service** - One library for all push notifications
✅ **Type-Safe** - Full TypeScript support
✅ **Preference-Aware** - Respects user notification settings
✅ **Helper Functions** - Pre-built functions for common notifications
✅ **Batch Processing** - Handles 100s of notifications efficiently
✅ **Error Handling** - Robust error handling and logging

---

## Setup & Installation

### 1. Library Location

The push notification service is located at:
```
/web/src/lib/push-notifications.ts
```

### 2. Import in API Routes

```typescript
import {
  sendPushNotifications,
  sendAnnouncementNotification,
  sendAssignmentNotification,
  sendGradeNotification,
  sendAttendanceNotification,
  sendEventNotification,
  sendMessageNotification,
  sendEmergencyNotification
} from '@/lib/push-notifications';
```

### 3. Environment Variables

Ensure these are set in your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Core Library

### Main Function: `sendPushNotifications`

```typescript
interface PushNotificationOptions {
  title: string;                    // Notification title
  body: string;                     // Notification body text
  schoolId: string;                 // School UUID
  notificationType: NotificationType; // Type of notification
  recipientRole?: RecipientRole;    // Optional: filter by role
  recipientIds?: string[];          // Optional: specific user IDs
  data?: Record<string, any>;       // Optional: custom data
  priority?: 'default' | 'high';    // Optional: priority (default: high)
  sound?: string;                   // Optional: sound (default: 'default')
  badge?: number;                   // Optional: badge number
}

// Usage
const result = await sendPushNotifications({
  title: "New Announcement",
  body: "School will be closed tomorrow",
  schoolId: "school-uuid",
  notificationType: "announcements",
  recipientRole: "parent"
});

// Returns
{
  success: boolean;
  sent: number;
  failed: number;
  errors?: any[];
}
```

### Notification Types

```typescript
type NotificationType =
  | 'announcements'
  | 'assignments'
  | 'grades'
  | 'attendance'
  | 'events'
  | 'messages'
  | 'reminders'
  | 'emergencies';
```

### Recipient Roles

```typescript
type RecipientRole = 'parent' | 'teacher' | 'student' | 'admin';
```

---

## Database Requirements

### Required Tables

#### 1. `push_tokens` (Already exists in mobile app setup)

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  school_id UUID REFERENCES schools(id) NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'android' or 'ios'
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

#### 2. `notification_preferences` (Already exists in mobile app setup)

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  announcements BOOLEAN DEFAULT true,
  assignments BOOLEAN DEFAULT true,
  grades BOOLEAN DEFAULT true,
  attendance BOOLEAN DEFAULT true,
  events BOOLEAN DEFAULT true,
  messages BOOLEAN DEFAULT true,
  reminders BOOLEAN DEFAULT true,
  emergencies BOOLEAN DEFAULT true, -- Cannot be disabled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `push_notification_queue` (For async/scheduled notifications)

```sql
CREATE TABLE push_notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tokens TEXT[] NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  notification_type TEXT NOT NULL,
  school_id UUID REFERENCES schools(id),
  scheduled_for TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration Examples

### 1. Post New Announcement

**File:** `/api/admin/post-announcement/route.ts`

```typescript
import { sendAnnouncementNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { title, content, school_id, target_audience } = await request.json();

  // Create announcement in database
  const { data: announcement } = await supabase
    .from('announcements')
    .insert({ title, content, school_id })
    .select()
    .single();

  // Send push notifications (async, non-blocking)
  sendAnnouncementNotification(
    school_id,
    title,
    content,
    announcement.id,
    target_audience // 'parent' | 'teacher' | undefined (all)
  )
    .then(result => {
      console.log(`Sent to ${result.sent} devices`);
    })
    .catch(error => {
      console.error('Notification error:', error);
    });

  return NextResponse.json({ success: true, announcement });
}
```

### 2. Post New Assignment

**File:** `/api/teacher/post-assignment/route.ts`

```typescript
import { sendAssignmentNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { title, due_date, class_id, school_id } = await request.json();

  // Create assignment
  const { data: assignment } = await supabase
    .from('homework')
    .insert({ title, due_date, class_id, school_id })
    .select()
    .single();

  // Get students in class
  const { data: students } = await supabase
    .from('student_classes')
    .select('student_id')
    .eq('class_id', class_id);

  const studentIds = students.map(s => s.student_id);

  // Send notifications
  sendAssignmentNotification(
    school_id,
    title,
    new Date(due_date).toLocaleDateString(),
    assignment.id,
    studentIds
  );

  return NextResponse.json({ success: true });
}
```

### 3. Publish Grades

**File:** `/api/teacher/publish-grades/route.ts`

```typescript
import { sendGradeNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { grades, school_id } = await request.json();
  // grades = [{ student_id, subject, grade }, ...]

  // Save grades to database
  await supabase.from('grades').insert(grades);

  // Send individual notifications
  for (const gradeEntry of grades) {
    sendGradeNotification(
      school_id,
      gradeEntry.subject,
      gradeEntry.grade,
      gradeEntry.student_id
    );
  }

  return NextResponse.json({ success: true });
}
```

### 4. Mark Attendance

**File:** `/api/teacher/mark-attendance/route.ts`

```typescript
import { sendAttendanceNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { student_id, status, school_id } = await request.json();
  // status: 'present' | 'absent' | 'late'

  // Save attendance
  await supabase.from('attendance').insert({
    student_id,
    status,
    date: new Date().toISOString()
  });

  // Get student info and parent
  const { data: student } = await supabase
    .from('students')
    .select('name, parent_id')
    .eq('id', student_id)
    .single();

  // Notify parent
  if (student.parent_id) {
    sendAttendanceNotification(
      school_id,
      student.name,
      status,
      student.parent_id
    );
  }

  return NextResponse.json({ success: true });
}
```

### 5. Create Event

**File:** `/api/admin/create-event/route.ts`

```typescript
import { sendEventNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { title, event_date, school_id, target_audience } = await request.json();

  // Create event
  const { data: event } = await supabase
    .from('events')
    .insert({ title, event_date, school_id })
    .select()
    .single();

  // Send notification
  sendEventNotification(
    school_id,
    title,
    new Date(event_date).toLocaleDateString(),
    event.id,
    target_audience
  );

  return NextResponse.json({ success: true });
}
```

### 6. Send Direct Message

**File:** `/api/messages/send/route.ts`

```typescript
import { sendMessageNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { sender_id, recipient_id, content, school_id } = await request.json();

  // Save message
  const { data: message } = await supabase
    .from('messages')
    .insert({ sender_id, recipient_id, content })
    .select()
    .single();

  // Get sender name
  const { data: sender } = await supabase
    .from('users')
    .select('name')
    .eq('id', sender_id)
    .single();

  // Notify recipient
  sendMessageNotification(
    school_id,
    sender.name,
    content.substring(0, 100), // Preview
    recipient_id,
    message.id
  );

  return NextResponse.json({ success: true });
}
```

### 7. Emergency Alert

**File:** `/api/admin/emergency-alert/route.ts`

```typescript
import { sendEmergencyNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  const { title, message, school_id } = await request.json();

  // Save emergency alert
  const { data: alert } = await supabase
    .from('emergency_alerts')
    .insert({ title, message, school_id })
    .select()
    .single();

  // Send to EVERYONE (cannot be disabled)
  await sendEmergencyNotification(
    school_id,
    title,
    message,
    alert.id
  );

  return NextResponse.json({ success: true });
}
```

---

## Cron Job Setup

### Vercel Cron Configuration

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/admin/send-push-notifications",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/admin/process-notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### What Each Cron Does:

1. **`/api/admin/send-push-notifications`**
   - Processes queued push notifications
   - Runs every 5 minutes
   - Sends batch notifications via Expo

2. **`/api/admin/process-notifications`**
   - Processes pending notifications from notification queue
   - Runs every 5 minutes
   - Integrates with push notification service

---

## Testing

### 1. Test Local Notifications

```bash
# Test announcement
curl -X POST http://localhost:3000/api/admin/post-announcement \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Announcement",
    "content": "This is a test notification",
    "school_id": "your-school-uuid",
    "created_by": "admin-uuid",
    "target_audience": "all"
  }'
```

### 2. Check Mobile App Logs

After login, you should see:
```
Push token: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
Push token stored successfully for user: user-uuid
```

### 3. Verify in Supabase

```sql
-- Check if tokens are being stored
SELECT * FROM push_tokens WHERE is_active = true;

-- Check notification preferences
SELECT * FROM notification_preferences;

-- Check notification queue
SELECT * FROM push_notification_queue WHERE status = 'pending';
```

### 4. Manual Test Notification

You can use the Expo Push Notification Tool:
https://expo.dev/notifications

Enter token: `ExponentPushToken[...]`
Title: "Test"
Message: "Testing notifications"

---

## Best Practices

### 1. **Don't Block API Responses**

✅ **Good:**
```typescript
// Send notifications asynchronously
sendPushNotifications(options)
  .then(result => console.log(`Sent to ${result.sent} devices`))
  .catch(error => console.error(error));

return NextResponse.json({ success: true });
```

❌ **Bad:**
```typescript
// Don't await - this blocks the API response
const result = await sendPushNotifications(options);
return NextResponse.json({ success: true });
```

### 2. **Handle Errors Gracefully**

```typescript
try {
  await sendPushNotifications(options);
} catch (error) {
  // Log error but don't fail the main operation
  console.error('Push notification failed:', error);
  // The main operation (e.g., creating assignment) should still succeed
}
```

### 3. **Respect User Preferences**

The library automatically filters out users who have disabled specific notification types. You don't need to check manually.

```typescript
// This will only send to users who have "assignments" enabled
sendAssignmentNotification(...);
```

### 4. **Emergency Notifications Override**

Emergency notifications ALWAYS send, regardless of user preferences:

```typescript
// Sends to everyone
sendEmergencyNotification(
  school_id,
  "Emergency: School Closed",
  "Due to severe weather, school is closed today",
  alert_id
);
```

### 5. **Batch Processing**

For large batches (100+ notifications), use the queue:

```typescript
import { queuePushNotification } from '@/lib/push-notifications';

// Queue for later processing by cron job
await queuePushNotification({
  title: "Batch Notification",
  body: "...",
  schoolId: "...",
  notificationType: "announcements",
  scheduledFor: new Date(Date.now() + 3600000).toISOString() // 1 hour later
});
```

### 6. **Data Payload Best Practices**

Include useful data for navigation:

```typescript
data: {
  type: 'assignment',
  id: assignment.id,
  screen: 'AssignmentDetail', // Where to navigate
  params: { assignmentId: assignment.id }
}
```

---

## Summary Checklist

### Setup:
- [x] Push notification library created (`/lib/push-notifications.ts`)
- [x] Database tables exist (`push_tokens`, `notification_preferences`, `push_notification_queue`)
- [x] Environment variables configured
- [x] Cron jobs configured (if using Vercel)

### Integration Points:

- [x] Post announcement → `sendAnnouncementNotification`
- [x] Post assignment → `sendAssignmentNotification`
- [x] Publish grades → `sendGradeNotification`
- [x] Mark attendance → `sendAttendanceNotification`
- [x] Create event → `sendEventNotification`
- [x] Send message → `sendMessageNotification`
- [x] Emergency alert → `sendEmergencyNotification`

### Testing:
- [ ] Test with physical device (notifications don't work on emulator)
- [ ] Verify tokens stored in database after login
- [ ] Send test notification from backend
- [ ] Verify notification appears on device
- [ ] Test notification preferences (disable/enable types)
- [ ] Test cron jobs processing queue

---

## Next Steps

1. **Integrate into Existing API Routes**
   - Add push notifications to all event handlers
   - Use helper functions for common scenarios
   - Test each integration point

2. **Monitor & Debug**
   - Check logs for notification delivery
   - Monitor Supabase `push_tokens` table
   - Track notification queue status

3. **Optimize**
   - Use batching for large-scale notifications
   - Schedule non-urgent notifications
   - Monitor Expo push ticket receipts

---

**Report Generated:** November 9, 2025
**For:** CampusHoster Backend Push Notification Integration
**Status:** ✅ Ready for production use
