/**
 * Push Notification Service for CampusHoster
 *
 * This service handles sending push notifications to mobile app users via Expo Push Service.
 * It integrates with the Supabase database to fetch push tokens and user preferences.
 */

import { createClient } from '@supabase/supabase-js';

// Environment check
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables for push notifications');
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo allows up to 100 notifications per request

export type NotificationType =
  | 'announcements'
  | 'assignments'
  | 'grades'
  | 'attendance'
  | 'events'
  | 'messages'
  | 'reminders'
  | 'emergencies';

export type RecipientRole = 'parent' | 'teacher' | 'student' | 'admin';

export interface PushNotificationOptions {
  title: string;
  body: string;
  schoolId: string;
  notificationType: NotificationType;
  recipientRole?: RecipientRole;
  recipientIds?: string[]; // Specific user IDs (optional)
  data?: Record<string, any>;
  priority?: 'default' | 'high';
  sound?: string;
  badge?: number;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'android' | 'ios';
  is_active: boolean;
}

export interface NotificationPreference {
  user_id: string;
  announcements: boolean;
  assignments: boolean;
  grades: boolean;
  attendance: boolean;
  events: boolean;
  messages: boolean;
  reminders: boolean;
  emergencies: boolean;
}

/**
 * Fetches active push tokens for users based on school, role, and notification preferences
 */
async function getActiveTokens(
  schoolId: string,
  notificationType: NotificationType,
  recipientRole?: RecipientRole,
  recipientIds?: string[]
): Promise<string[]> {
  try {
    // Build query for push tokens
    let query = supabaseAdmin
      .from('push_tokens')
      .select(`
        token,
        user_id,
        users!inner(
          id,
          school_id,
          role,
          notification_preferences(
            ${notificationType}
          )
        )
      `)
      .eq('is_active', true)
      .eq('users.school_id', schoolId);

    // Filter by role if specified
    if (recipientRole) {
      query = query.eq('users.role', recipientRole);
    }

    // Filter by specific user IDs if specified
    if (recipientIds && recipientIds.length > 0) {
      query = query.in('user_id', recipientIds);
    }

    const { data: tokens, error } = await query;

    if (error) {
      console.error('Error fetching push tokens:', error);
      return [];
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for the specified criteria');
      return [];
    }

    // Filter tokens based on user notification preferences
    // Emergency notifications cannot be disabled
    const activeTokens = tokens.filter((tokenData: any) => {
      if (notificationType === 'emergencies') {
        return true; // Always send emergency notifications
      }

      const preferences = tokenData.users?.notification_preferences?.[0];
      if (!preferences) {
        return true; // If no preferences set, default to enabled
      }

      return preferences[notificationType] !== false;
    });

    return activeTokens.map((tokenData: any) => tokenData.token);
  } catch (error) {
    console.error('Error in getActiveTokens:', error);
    return [];
  }
}

/**
 * Sends push notifications via Expo Push Service
 */
async function sendToExpoPushService(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  priority: 'default' | 'high' = 'high',
  sound: string = 'default',
  badge?: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  if (tokens.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const messages = tokens.map(token => ({
    to: token,
    title,
    body,
    data: data || {},
    sound,
    priority,
    badge,
    channelId: 'default'
  }));

  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  // Send in batches of 100
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();

      // Process results
      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === 'ok') {
            successCount++;
          } else {
            failedCount++;
            errors.push({
              message: ticket.message,
              details: ticket.details
            });
          }
        }
      } else {
        failedCount += batch.length;
        errors.push({
          message: 'No data in response',
          response: result
        });
      }
    } catch (error) {
      console.error('Error sending batch to Expo:', error);
      failedCount += batch.length;
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        batch: batch.length
      });
    }
  }

  return { success: successCount, failed: failedCount, errors };
}

/**
 * Main function to send push notifications
 *
 * @example
 * // Send announcement to all parents in a school
 * await sendPushNotifications({
 *   title: "School Holiday Tomorrow",
 *   body: "The school will be closed tomorrow for National Day",
 *   schoolId: "school-uuid",
 *   recipientRole: "parent",
 *   notificationType: "announcements",
 *   data: { type: "announcement", id: "announcement-123" }
 * });
 *
 * @example
 * // Send assignment notification to specific students
 * await sendPushNotifications({
 *   title: "New Assignment Posted",
 *   body: "Mathematics homework is due on Friday",
 *   schoolId: "school-uuid",
 *   recipientRole: "student",
 *   recipientIds: ["user-1", "user-2", "user-3"],
 *   notificationType: "assignments",
 *   data: { type: "assignment", id: "assignment-456" }
 * });
 */
export async function sendPushNotifications(
  options: PushNotificationOptions
): Promise<{ success: boolean; sent: number; failed: number; errors?: any[] }> {
  try {
    const {
      title,
      body,
      schoolId,
      notificationType,
      recipientRole,
      recipientIds,
      data,
      priority = 'high',
      sound = 'default',
      badge
    } = options;

    // Validate required fields
    if (!title || !body || !schoolId || !notificationType) {
      throw new Error('Missing required notification fields');
    }

    console.log(`Sending ${notificationType} notification to ${recipientRole || 'all roles'} in school ${schoolId}`);

    // Get active tokens
    const tokens = await getActiveTokens(
      schoolId,
      notificationType,
      recipientRole,
      recipientIds
    );

    if (tokens.length === 0) {
      console.log('No active tokens found for notification');
      return { success: true, sent: 0, failed: 0 };
    }

    console.log(`Found ${tokens.length} active tokens`);

    // Send notifications
    const result = await sendToExpoPushService(
      tokens,
      title,
      body,
      data,
      priority,
      sound,
      badge
    );

    console.log(`Notification sent: ${result.success} success, ${result.failed} failed`);

    return {
      success: result.failed === 0 || result.success > 0,
      sent: result.success,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined
    };
  } catch (error) {
    console.error('Error in sendPushNotifications:', error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }]
    };
  }
}

/**
 * Queue a push notification for later sending (via cron job)
 */
export async function queuePushNotification(
  options: PushNotificationOptions & { scheduledFor?: string }
): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    const {
      title,
      body,
      schoolId,
      notificationType,
      recipientRole,
      recipientIds,
      data,
      scheduledFor
    } = options;

    // Get tokens
    const tokens = await getActiveTokens(
      schoolId,
      notificationType,
      recipientRole,
      recipientIds
    );

    if (tokens.length === 0) {
      return { success: true, queueId: undefined }; // No tokens, nothing to queue
    }

    // Insert into queue
    const { data: queueItem, error } = await supabaseAdmin
      .from('push_notification_queue')
      .insert({
        tokens,
        title,
        body,
        data: data || {},
        notification_type: notificationType,
        school_id: schoolId,
        scheduled_for: scheduledFor || new Date().toISOString(),
        status: 'pending',
        attempts: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error queuing push notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, queueId: queueItem.id };
  } catch (error) {
    console.error('Error in queuePushNotification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send immediate notification (wrapper for convenience)
 */
export async function sendImmediateNotification(
  options: PushNotificationOptions
) {
  return sendPushNotifications(options);
}

/**
 * Helper functions for common notification types
 */

export async function sendAnnouncementNotification(
  schoolId: string,
  title: string,
  body: string,
  announcementId: string,
  recipientRole?: RecipientRole
) {
  return sendPushNotifications({
    title,
    body,
    schoolId,
    notificationType: 'announcements',
    recipientRole,
    data: { type: 'announcement', id: announcementId }
  });
}

export async function sendAssignmentNotification(
  schoolId: string,
  assignmentTitle: string,
  dueDate: string,
  assignmentId: string,
  studentIds: string[]
) {
  return sendPushNotifications({
    title: 'New Assignment Posted',
    body: `${assignmentTitle} is due on ${dueDate}`,
    schoolId,
    notificationType: 'assignments',
    recipientRole: 'student',
    recipientIds: studentIds,
    data: { type: 'assignment', id: assignmentId }
  });
}

export async function sendGradeNotification(
  schoolId: string,
  subject: string,
  grade: string,
  studentId: string
) {
  return sendPushNotifications({
    title: 'New Grade Posted',
    body: `You received ${grade} in ${subject}`,
    schoolId,
    notificationType: 'grades',
    recipientRole: 'student',
    recipientIds: [studentId],
    data: { type: 'grade', subject }
  });
}

export async function sendAttendanceNotification(
  schoolId: string,
  studentName: string,
  status: 'present' | 'absent' | 'late',
  parentId: string
) {
  const statusText = status === 'present' ? 'marked present' :
                     status === 'absent' ? 'marked absent' : 'marked late';

  return sendPushNotifications({
    title: 'Attendance Update',
    body: `${studentName} was ${statusText} today`,
    schoolId,
    notificationType: 'attendance',
    recipientRole: 'parent',
    recipientIds: [parentId],
    data: { type: 'attendance', status }
  });
}

export async function sendEventNotification(
  schoolId: string,
  eventTitle: string,
  eventDate: string,
  eventId: string,
  recipientRole?: RecipientRole
) {
  return sendPushNotifications({
    title: 'Upcoming Event',
    body: `${eventTitle} is scheduled for ${eventDate}`,
    schoolId,
    notificationType: 'events',
    recipientRole,
    data: { type: 'event', id: eventId }
  });
}

export async function sendMessageNotification(
  schoolId: string,
  senderName: string,
  messagePreview: string,
  recipientId: string,
  messageId: string
) {
  return sendPushNotifications({
    title: `Message from ${senderName}`,
    body: messagePreview,
    schoolId,
    notificationType: 'messages',
    recipientIds: [recipientId],
    data: { type: 'message', id: messageId }
  });
}

export async function sendEmergencyNotification(
  schoolId: string,
  title: string,
  body: string,
  emergencyId: string
) {
  return sendPushNotifications({
    title,
    body,
    schoolId,
    notificationType: 'emergencies',
    priority: 'high',
    data: { type: 'emergency', id: emergencyId }
  });
}
