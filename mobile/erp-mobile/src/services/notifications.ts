import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
export async function storePushToken(userId: string, token: string, role: 'teacher' | 'parent') {
  // This would typically make an API call to store the token
  // For now, we'll just log it
  console.log('Storing push token for user:', userId, 'Role:', role, 'Token:', token);
  
  // TODO: Implement API call to store token
  // Example:
  // await supabase.from('push_tokens').upsert({
  //   user_id: userId,
  //   token,
  //   platform: Platform.OS,
  //   role,
  //   updated_at: new Date().toISOString()
  // });
} 