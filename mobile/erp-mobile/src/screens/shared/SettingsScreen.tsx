import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings as SettingsIcon,
  Info
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { user, signOut, isTeacher, isParent } = useAuth();
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    sms: false,
    homework: true,
    attendance: true,
    announcements: true,
    grades: true
  });

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const profileSections = [
    {
      title: 'Support & Information',
      items: [
        {
          title: 'About',
          description: 'App version and information',
          icon: Info,
          onPress: () => Alert.alert('ERP School Mobile', 'Version 1.0.0\nBuilt with ❤️ for education\n\nA comprehensive school management system designed to streamline communication between teachers, parents, and administrators.')},
        {
          title: 'Help & Support',
          description: 'Contact school administration',
          icon: HelpCircle,
          onPress: () => Alert.alert('Help & Support', 'For assistance, please contact your school administration or IT support team.')}
      ]
    }
  ];

  const notificationSettings = [
    {
      key: 'push',
      title: 'Push Notifications',
      description: 'Receive notifications on your device'
    },
    {
      key: 'email',
      title: 'Email Notifications',
      description: 'Get updates via email'
    },
    {
      key: 'homework',
      title: 'Homework Reminders',
      description: 'Notifications for homework deadlines'
    },
    {
      key: 'attendance',
      title: 'Attendance Alerts',
      description: 'Daily attendance notifications'
    },
    {
      key: 'announcements',
      title: 'School Announcements',
      description: 'Important school updates'
    },
    {
      key: 'grades',
      title: 'Grade Updates',
      description: 'New grades and results'
    }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Enhanced Header */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#8b5cf6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <SettingsIcon size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Settings
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Customize your app experience
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 20 }}>
        {/* Enhanced User Profile Card */}
        <View style={{ marginBottom: 32 }}>
          <Card>
            <CardContent style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 30, 
                  backgroundColor: isTeacher ? '#3b82f6' : '#10b981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
                    {user?.first_name?.charAt(0) || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                    {user?.first_name} {user?.last_name}
                  </Text>
                  <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
                    {user?.email}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      backgroundColor: isTeacher ? '#dbeafe' : '#dcfce7', 
                      paddingHorizontal: 12, 
                      paddingVertical: 4, 
                      borderRadius: 16, 
                      marginRight: 8
                    }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '500', 
                        color: isTeacher ? '#1d4ed8' : '#16a34a' 
                      }}>
                        {isTeacher ? 'Teacher' : 'Parent'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: 4, 
                        backgroundColor: '#10b981',
                        marginRight: 4 
                      }} />
                      <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '500' }}>
                        Active
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    Member Since
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                    {new Date().getFullYear()}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    Role
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>
                    {user?.role?.replace('_', ' ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    Status
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#10b981' }}>
                    Verified
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Notification Settings */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Bell size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Notifications
            </Text>
          </View>
          
          <Card>
            <CardContent style={{ padding: 20 }}>
              {notificationSettings.map((setting, index) => (
                <View key={setting.key} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: index < notificationSettings.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6'
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 }}>
                      {setting.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                      {setting.description}
                    </Text>
                  </View>
                  <Switch
                    value={notifications[setting.key as keyof typeof notifications]}
                    onValueChange={(value) => handleNotificationToggle(setting.key, value)}
                    trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
                    thumbColor={notifications[setting.key as keyof typeof notifications] ? '#ffffff' : '#ffffff'}
                  />
                </View>
              ))}
            </CardContent>
          </Card>
        </View>

        {/* Settings Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              {section.title}
            </Text>
            <Card>
              <CardContent style={{ padding: 0 }}>
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={item.onPress}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: '#f3f4f6'
                    }}
                  >
                    <View style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 20, 
                      backgroundColor: '#f3f4f6', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginRight: 16
                    }}>
                      <item.icon size={20} color="#6b7280" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 }}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>
                        {item.description}
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#6b7280" />
                  </TouchableOpacity>
                ))}
              </CardContent>
            </Card>
          </View>
        ))}

        {/* Sign Out */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
            Account
          </Text>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <TouchableOpacity
                onPress={handleSignOut}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#fee2e2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <LogOut size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#ef4444', marginBottom: 2 }}>
                    Sign Out
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    Sign out of your account
                  </Text>
                </View>
                <ChevronRight size={20} color="#6b7280" />
              </TouchableOpacity>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
