import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person',
          title: 'Profile Information',
          subtitle: 'View and edit your profile',
          onPress: () => Alert.alert('Info', 'Profile editing coming soon'),
        },
        {
          icon: 'notifications',
          title: 'Notifications',
          subtitle: 'Manage notification preferences',
          rightComponent: (
            <Switch 
              value={notifications} 
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
            />
          ),
        },
        {
          icon: 'shield-checkmark',
          title: 'Privacy & Security',
          subtitle: 'Manage your privacy settings',
          onPress: () => Alert.alert('Info', 'Privacy settings coming soon'),
        },
      ],
    },
    {
      title: 'App Settings',
      items: [
        {
          icon: 'moon',
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          rightComponent: (
            <Switch 
              value={darkMode} 
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
            />
          ),
        },
        {
          icon: 'sync',
          title: 'Auto Sync',
          subtitle: 'Automatically sync data',
          rightComponent: (
            <Switch 
              value={autoSync} 
              onValueChange={setAutoSync}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor={autoSync ? '#ffffff' : '#f4f3f4'}
            />
          ),
        },
        {
          icon: 'language',
          title: 'Language',
          subtitle: 'English',
          onPress: () => Alert.alert('Info', 'Language selection coming soon'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle',
          title: 'Help & FAQ',
          subtitle: 'Get help and support',
          onPress: () => Alert.alert('Info', 'Help center coming soon'),
        },
        {
          icon: 'information-circle',
          title: 'About',
          subtitle: 'App version and information',
          onPress: () => Alert.alert('About', 'CampusHoster Teacher App v1.0.0'),
        },
        {
          icon: 'mail',
          title: 'Contact Support',
          subtitle: 'Get in touch with our team',
          onPress: () => Alert.alert('Contact', 'Email: support@campushoster.com'),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={40} color="#ffffff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>Teacher</Text>
          </View>
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="create" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupContainer}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingsItem,
                    itemIndex === group.items.length - 1 && styles.settingsItemLast
                  ]}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                >
                  <View style={styles.settingsItemLeft}>
                    <View style={styles.settingsItemIcon}>
                      <Ionicons name={item.icon as any} size={22} color="#3B82F6" />
                    </View>
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemTitle}>{item.title}</Text>
                      <Text style={styles.settingsItemSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.settingsItemRight}>
                    {item.rightComponent || (
                      item.onPress && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>CampusHoster Teacher v1.0.0</Text>
          <Text style={styles.buildText}>Build 2024.1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  editProfileButton: {
    padding: 8,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  groupContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemLast: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingsItemRight: {
    marginLeft: 12,
  },
  signOutContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
}); 