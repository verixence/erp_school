import { supabase } from '../services/supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

export interface SendNotificationOptions {
  schoolId: string;
  recipientType: 'all' | 'teachers' | 'parents' | 'students' | 'individual';
  recipientIds?: string[]; // Required if recipientType is 'individual'
  notificationType: 'announcements' | 'assignments' | 'grades' | 'attendance' | 'events' | 'messages' | 'reminders' | 'emergencies';
  sentBy?: string; // User ID of sender
}

// This function would typically be called from a backend service
// It's included here for demonstration purposes
export async function sendPushNotification(
  payload: NotificationPayload,
  options: SendNotificationOptions
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  try {
    console.log('Sending push notification:', payload, options);

    // Get push tokens for recipients
    const { data: tokens, error: tokensError } = await supabase
      .rpc('get_push_tokens', {
        p_school_id: options.schoolId,
        p_recipient_type: options.recipientType,
        p_user_ids: options.recipientIds || null
      });

    if (tokensError) {
      console.error('Error getting push tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for recipients');
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    // Filter tokens based on user preferences
    const validTokens = [];
    for (const tokenData of tokens) {
      // Check if user has this notification type enabled
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select(options.notificationType)
        .eq('user_id', tokenData.user_id)
        .single();

      // Default to enabled if no preferences found, or if it's an emergency
      const isEnabled = options.notificationType === 'emergencies' ||
                       !preferences ||
                       (preferences && preferences[options.notificationType as keyof typeof preferences] !== false);

      if (isEnabled) {
        validTokens.push(tokenData.token);
      }
    }

    console.log(`Sending to ${validTokens.length} tokens out of ${tokens.length} total`);

    let sentCount = 0;
    let failedCount = 0;

    // Send notifications in batches (Expo allows up to 100 notifications per request)
    const batchSize = 100;
    for (let i = 0; i < validTokens.length; i += batchSize) {
      const batch = validTokens.slice(i, i + batchSize);
      
      try {
        const messages = batch.map(token => ({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: payload.sound || 'default',
          badge: payload.badge,
          priority: 'high',
          channelId: 'default'
        }));

        // This would typically be sent to Expo's push notification service
        // For now, we'll just log it
        console.log('Would send notification batch:', messages);
        
        // Simulate successful sending
        sentCount += batch.length;
        
        // In a real implementation, you would:
        // const response = await fetch('https://exp.host/--/api/v2/push/send', {
        //   method: 'POST',
        //   headers: {
        //     'Accept': 'application/json',
        //     'Accept-encoding': 'gzip, deflate',
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(messages),
        // });
        // 
        // const result = await response.json();
        // Handle the response and update sentCount/failedCount accordingly

      } catch (error) {
        console.error('Error sending notification batch:', error);
        failedCount += batch.length;
      }
    }

    // Log the notification in the database
    await supabase.rpc('log_notification', {
      p_school_id: options.schoolId,
      p_title: payload.title,
      p_body: payload.body,
      p_data: payload.data || null,
      p_recipient_type: options.recipientType,
      p_recipient_ids: options.recipientIds || null,
      p_sent_by: options.sentBy || null,
      p_sent_count: sentCount,
      p_failed_count: failedCount
    });

    console.log(`Notification sent: ${sentCount} successful, ${failedCount} failed`);

    return {
      success: failedCount === 0,
      sentCount,
      failedCount
    };

  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    throw error;
  }
}

// Helper functions for common notification types
export const sendAnnouncementNotification = (
  title: string,
  body: string,
  schoolId: string,
  recipientType: 'all' | 'teachers' | 'parents' | 'students' = 'all',
  sentBy?: string
) => {
  return sendPushNotification(
    {
      title,
      body,
      data: { screen: 'Community', type: 'announcement' }
    },
    {
      schoolId,
      recipientType,
      notificationType: 'announcements',
      sentBy
    }
  );
};

export const sendAssignmentNotification = (
  title: string,
  body: string,
  schoolId: string,
  assignmentId: string,
  recipientIds?: string[],
  sentBy?: string
) => {
  return sendPushNotification(
    {
      title,
      body,
      data: { screen: 'Assignments', assignmentId, type: 'assignment' }
    },
    {
      schoolId,
      recipientType: recipientIds ? 'individual' : 'students',
      recipientIds,
      notificationType: 'assignments',
      sentBy
    }
  );
};

export const sendGradeNotification = (
  title: string,
  body: string,
  schoolId: string,
  studentId: string,
  gradeId: string,
  sentBy?: string
) => {
  return sendPushNotification(
    {
      title,
      body,
      data: { screen: 'Grades', gradeId, type: 'grade' }
    },
    {
      schoolId,
      recipientType: 'individual',
      recipientIds: [studentId],
      notificationType: 'grades',
      sentBy
    }
  );
};

export const sendEventNotification = (
  title: string,
  body: string,
  schoolId: string,
  eventId: string,
  recipientType: 'all' | 'teachers' | 'parents' | 'students' = 'all',
  sentBy?: string
) => {
  return sendPushNotification(
    {
      title,
      body,
      data: { screen: 'Calendar', eventId, type: 'event' }
    },
    {
      schoolId,
      recipientType,
      notificationType: 'events',
      sentBy
    }
  );
};

export const sendEmergencyNotification = (
  title: string,
  body: string,
  schoolId: string,
  sentBy?: string
) => {
  return sendPushNotification(
    {
      title,
      body,
      data: { screen: 'Emergency', type: 'emergency' },
      sound: 'default',
      badge: 1
    },
    {
      schoolId,
      recipientType: 'all',
      notificationType: 'emergencies',
      sentBy
    }
  );
};