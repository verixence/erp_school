import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import {
  Bell,
  BellOff,
  MessageSquare,
  BookOpen,
  Calendar,
  Award,
  Users,
  AlertTriangle,
  Clock,
  ChevronLeft
} from 'lucide-react-native';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationPermissionStatus
} from '../../services/notifications';

interface NotificationPreferences {
  announcements: boolean;
  assignments: boolean;
  grades: boolean;
  attendance: boolean;
  events: boolean;
  messages: boolean;
  reminders: boolean;
  emergencies: boolean;
}

interface NotificationSetting {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const notificationSettings: NotificationSetting[] = [
  {
    key: 'emergencies',
    label: 'Emergency Alerts',
    description: 'Critical school safety and emergency notifications',
    icon: AlertTriangle,
    color: '#ef4444'
  },
  {
    key: 'announcements',
    label: 'School Announcements',
    description: 'General school news and announcements',
    icon: Bell,
    color: '#3b82f6'
  },
  {
    key: 'assignments',
    label: 'Assignments & Homework',
    description: 'New assignments and homework notifications',
    icon: BookOpen,
    color: '#8b5cf6'
  },
  {
    key: 'grades',
    label: 'Grades & Results',
    description: 'Test scores and grade updates',
    icon: Award,
    color: '#10b981'
  },
  {
    key: 'attendance',
    label: 'Attendance Updates',
    description: 'Daily attendance reports and alerts',
    icon: Users,
    color: '#f59e0b'
  },
  {
    key: 'events',
    label: 'School Events',
    description: 'Upcoming events and calendar reminders',
    icon: Calendar,
    color: '#06b6d4'
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Direct messages from teachers and school',
    icon: MessageSquare,
    color: '#84cc16'
  },
  {
    key: 'reminders',
    label: 'Reminders',
    description: 'Fee due dates and other important reminders',
    icon: Clock,
    color: '#f97316'
  }
];

export const NotificationSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    announcements: true,
    assignments: true,
    grades: true,
    attendance: true,
    events: true,
    messages: true,
    reminders: true,
    emergencies: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('granted');

  useEffect(() => {
    loadPreferences();
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  };

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userPreferences = await getNotificationPreferences(user.id);
      
      if (userPreferences) {
        setPreferences({
          announcements: userPreferences.announcements ?? true,
          assignments: userPreferences.assignments ?? true,
          grades: userPreferences.grades ?? true,
          attendance: userPreferences.attendance ?? true,
          events: userPreferences.events ?? true,
          messages: userPreferences.messages ?? true,
          reminders: userPreferences.reminders ?? true,
          emergencies: userPreferences.emergencies ?? true
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.id) return;

    // Prevent disabling emergency notifications
    if (key === 'emergencies' && !value) {
      Alert.alert(
        'Emergency Notifications',
        'Emergency notifications cannot be disabled for safety reasons.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSaving(true);
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);

      await updateNotificationPreferences(user.id, { [key]: value });
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert the change on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update notification preference');
    } finally {
      setSaving(false);
    }
  };

  const toggleAllNotifications = () => {
    const allEnabled = Object.values(preferences).every(value => value);
    const newValue = !allEnabled;

    // Update all preferences except emergencies (which should always be true)
    const updatedPreferences = { ...preferences };
    Object.keys(preferences).forEach(key => {
      if (key !== 'emergencies') {
        updatedPreferences[key as keyof NotificationPreferences] = newValue;
      }
    });

    setPreferences(updatedPreferences);

    // Save to database
    if (user?.id) {
      const prefsToUpdate = { ...updatedPreferences };
      delete prefsToUpdate.emergencies; // Don't update emergencies
      updateNotificationPreferences(user.id, prefsToUpdate).catch(error => {
        console.error('Error updating all preferences:', error);
        Alert.alert('Error', 'Failed to update notification preferences');
        loadPreferences(); // Reload on error
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const allEnabled = Object.values(preferences).every(value => value);
  const someEnabled = Object.values(preferences).some(value => value);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 24, 
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16, padding: 4 }}
            >
              <ChevronLeft size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={{ 
              backgroundColor: '#8b5cf6', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <Bell size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                Notifications
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Manage your notification preferences
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        {/* Permission Status */}
        {permissionStatus !== 'granted' && (
          <Card style={{ marginBottom: 16, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
              <BellOff size={24} color="#ef4444" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#dc2626' }}>
                  Notifications Disabled
                </Text>
                <Text style={{ fontSize: 14, color: '#991b1b', marginTop: 4 }}>
                  Please enable notifications in your device settings to receive updates.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Master Toggle */}
        <Card style={{ marginBottom: 24 }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                  All Notifications
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                  {allEnabled ? 'All notification types are enabled' : someEnabled ? 'Some notification types are enabled' : 'All notifications are disabled'}
                </Text>
              </View>
              <Switch
                value={allEnabled}
                onValueChange={toggleAllNotifications}
                trackColor={{ false: '#f3f4f6', true: '#ddd6fe' }}
                thumbColor={allEnabled ? '#8b5cf6' : '#9ca3af'}
                disabled={saving}
              />
            </View>
          </View>
        </Card>

        {/* Individual Settings */}
        <View style={{ gap: 16 }}>
          {notificationSettings.map((setting) => {
            const IconComponent = setting.icon;
            const isEnabled = preferences[setting.key];
            const isEmergency = setting.key === 'emergencies';
            
            return (
              <Card key={setting.key}>
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        backgroundColor: setting.color + '20',
                        padding: 10,
                        borderRadius: 10,
                        marginRight: 12
                      }}>
                        <IconComponent size={20} color={setting.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: '600', 
                            color: '#111827',
                            flex: 1
                          }}>
                            {setting.label}
                          </Text>
                          {isEmergency && (
                            <View style={{
                              backgroundColor: '#fef2f2',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                              marginLeft: 8
                            }}>
                              <Text style={{ 
                                fontSize: 10, 
                                fontWeight: '600', 
                                color: '#dc2626' 
                              }}>
                                REQUIRED
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ 
                          fontSize: 14, 
                          color: '#6b7280', 
                          marginTop: 2 
                        }}>
                          {setting.description}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={(value) => updatePreference(setting.key, value)}
                      trackColor={{ false: '#f3f4f6', true: setting.color + '40' }}
                      thumbColor={isEnabled ? setting.color : '#9ca3af'}
                      disabled={saving || isEmergency}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Info Note */}
        <Card style={{ marginTop: 24, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 14, color: '#0369a1' }}>
              <Text style={{ fontWeight: '600' }}>Note:</Text> Emergency notifications cannot be disabled for safety reasons. 
              You can manage notification sounds and timing in your device settings.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsScreen;