import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications should be handled when the app is running
// For mobile apps: Don't show in-app notifications - only push notifications when app is in background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,  // Don't show in-app alerts (only push notifications)
    shouldPlaySound: false,  // Don't play sound when app is open
    shouldSetBadge: true,    // Update badge count
  }),
});

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Register for push notifications
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      console.log('Push token:', token);
    } catch (e) {
      console.error('Error getting push token:', e);
      token = null;
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Send a local notification
export async function sendLocalNotification(data: PushNotificationData) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: data.title,
      body: data.body,
      data: data.data || {},
    },
    trigger: null, // Show immediately
  });
}

// Schedule a notification
export async function scheduleNotification(
  data: PushNotificationData,
  trigger: Notifications.NotificationTriggerInput
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: data.title,
      body: data.body,
      data: data.data || {},
    },
    trigger,
  });
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get notification permission status
export async function getNotificationPermissionStatus() {
  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}

// Notification response handlers
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

// Store the push token in the database (to be called after login)
export async function storePushToken(userId: string, token: string, schoolId: string) {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        school_id: schoolId,
        token,
        platform: Platform.OS,
        device_name: Device.deviceName || `${Platform.OS} Device`,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,token'
      });

    if (error) {
      console.error('Error storing push token:', error);
      throw error;
    }

    console.log('Push token stored successfully for user:', userId);
    return data;
  } catch (error) {
    console.error('Failed to store push token:', error);
    throw error;
  }
}

// Remove push token when user logs out
export async function removePushToken(userId: string, token?: string) {
  try {
    let query = supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (token) {
      query = query.eq('token', token);
    }

    const { error } = await query;

    if (error) {
      console.error('Error removing push token:', error);
      throw error;
    }

    console.log('Push token removed successfully for user:', userId);
  } catch (error) {
    console.error('Failed to remove push token:', error);
    throw error;
  }
}

// Get user's notification preferences
export async function getNotificationPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching notification preferences:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return null;
  }
}

// Update user's notification preferences
export async function updateNotificationPreferences(userId: string, preferences: Partial<{
  announcements: boolean;
  assignments: boolean;
  grades: boolean;
  attendance: boolean;
  events: boolean;
  messages: boolean;
  reminders: boolean;
  emergencies: boolean;
}>) {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }

    console.log('Notification preferences updated successfully for user:', userId);
    return data;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
}

// Check if notifications are enabled for a specific type
export async function isNotificationTypeEnabled(userId: string, type: string): Promise<boolean> {
  try {
    const preferences = await getNotificationPreferences(userId);
    if (!preferences) return true; // Default to enabled if no preferences found
    
    return preferences[type as keyof typeof preferences] !== false;
  } catch (error) {
    console.error('Error checking notification type:', error);
    return true; // Default to enabled on error
  }
} 