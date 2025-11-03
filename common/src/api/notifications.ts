import { supabase } from './supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Notification {
  id: string;
  school_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'announcement' | 'post' | 'system' | 'exam' | 'homework' | 'event';
  related_id?: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

export interface CreateNotificationData {
  school_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'announcement' | 'post' | 'system' | 'exam' | 'homework' | 'event';
  related_id?: string;
  expires_at?: string;
}

// Get notifications for a user
export const getNotifications = async (userId: string, limit = 50): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Get unread notifications count
export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return data?.length || 0;
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

// Create a notification manually
export const createNotification = async (notificationData: CreateNotificationData): Promise<Notification> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

// React Query Hooks
export const useNotifications = (userId: string, limit = 50) => {
  return useQuery({
    queryKey: ['notifications', userId, limit],
    queryFn: () => getNotifications(userId, limit),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useUnreadNotificationsCount = (userId: string) => {
  return useQuery({
    queryKey: ['notifications-count', userId],
    queryFn: () => getUnreadNotificationsCount(userId),
    enabled: !!userId,
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });
};

// Real-time subscription for notifications
export const subscribeToNotifications = (userId: string, callback: (notification: Notification) => void) => {
  return supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();
};

// ============================================================================
// PUSH NOTIFICATION FUNCTIONS (Web → Mobile Sync)
// ============================================================================

export interface BulkNotificationResult {
  notifications_created: number;
  push_notifications_queued: number;
}

/**
 * Create bulk notifications with automatic push notification queuing
 * This is the PRIMARY function to use for announcements, homework, events, etc.
 * It creates in-app notifications AND queues push notifications automatically
 */
export const createBulkNotifications = async (
  schoolId: string,
  title: string,
  message: string,
  type: 'announcement' | 'post' | 'system' | 'exam' | 'homework' | 'event',
  targetAudience: 'all' | 'teachers' | 'parents' | 'students',
  relatedId?: string
): Promise<BulkNotificationResult> => {
  const { data, error } = await supabase.rpc('create_bulk_notifications_with_push', {
    p_school_id: schoolId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_target_audience: targetAudience,
    p_related_id: relatedId || null
  });

  if (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }

  const result = data[0] as BulkNotificationResult;
  console.log(`✅ Created ${result.notifications_created} notifications, queued ${result.push_notifications_queued} push notifications`);

  return result;
};

/**
 * Send push notification to specific users
 * Use this when you need to notify specific users (not based on role)
 */
export const sendPushToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<number> => {
  const { data: result, error } = await supabase.rpc('send_push_to_users', {
    p_user_ids: userIds,
    p_title: title,
    p_body: body,
    p_data: data || {}
  });

  if (error) {
    console.error('Error sending push to users:', error);
    throw error;
  }

  console.log(`✅ Queued push notification for ${result} devices`);
  return result as number;
};

/**
 * Get users by audience (teachers, parents, students, or all)
 * Useful for getting user IDs before sending targeted notifications
 */
export const getUsersByAudience = async (
  schoolId: string,
  audience: 'all' | 'teachers' | 'parents' | 'students'
): Promise<Array<{ id: string; email: string; role: string }>> => {
  const { data, error } = await supabase.rpc('get_users_by_audience', {
    p_school_id: schoolId,
    p_audience: audience
  });

  if (error) {
    console.error('Error getting users by audience:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get push notification queue stats
 * Useful for monitoring and debugging
 */
export const getPushQueueStats = async () => {
  const { data, error } = await supabase
    .from('notification_queue_stats')
    .select('*');

  if (error) {
    console.error('Error getting queue stats:', error);
    throw error;
  }

  return data;
};

// ============================================================================
// HELPER FUNCTIONS FOR SPECIFIC NOTIFICATION TYPES
// ============================================================================

/**
 * Send announcement notification (Web + Mobile)
 */
export const sendAnnouncementNotification = async (
  schoolId: string,
  title: string,
  content: string,
  targetAudience: 'all' | 'teachers' | 'parents' | 'students' = 'all',
  announcementId?: string
) => {
  return createBulkNotifications(
    schoolId,
    title,
    content,
    'announcement',
    targetAudience,
    announcementId
  );
};

/**
 * Send homework notification (Web + Mobile)
 */
export const sendHomeworkNotification = async (
  schoolId: string,
  title: string,
  description: string,
  targetAudience: 'students' | 'parents',
  homeworkId?: string
) => {
  return createBulkNotifications(
    schoolId,
    `📚 New Homework: ${title}`,
    description,
    'homework',
    targetAudience,
    homeworkId
  );
};

/**
 * Send exam notification (Web + Mobile)
 */
export const sendExamNotification = async (
  schoolId: string,
  title: string,
  details: string,
  targetAudience: 'students' | 'parents',
  examId?: string
) => {
  return createBulkNotifications(
    schoolId,
    `📝 ${title}`,
    details,
    'exam',
    targetAudience,
    examId
  );
};

/**
 * Send calendar event notification (Web + Mobile)
 */
export const sendEventNotification = async (
  schoolId: string,
  eventTitle: string,
  eventDetails: string,
  targetAudience: 'all' | 'teachers' | 'parents' = 'all',
  eventId?: string
) => {
  return createBulkNotifications(
    schoolId,
    `📅 ${eventTitle}`,
    eventDetails,
    'event',
    targetAudience,
    eventId
  );
}; 