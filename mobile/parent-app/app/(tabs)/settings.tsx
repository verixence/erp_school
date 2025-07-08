import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Custom components
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/Card';
import { Heading1, Heading2, Heading3, Body, BodySmall, Caption } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme/colors';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren } from '../../src/hooks/useParentData';
import { supabase } from '../../src/lib/supabase';

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  academicUpdates: boolean;
  attendanceAlerts: boolean;
  homeworkReminders: boolean;
  schoolAnnouncements: boolean;
  eventReminders: boolean;
  emergencyAlerts: boolean;
  paymentReminders: boolean;
}

interface PrivacySettings {
  shareContactWithTeachers: boolean;
  receiveMarketingEmails: boolean;
  allowDataCollection: boolean;
  twoFactorAuth: boolean;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Get children data for display
  const { data: children = [] } = useChildren(user?.id);

  // Parent profile data
  const [parentData, setParentData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    alternatePhone: '',
    address: '',
    occupation: '',
    relationship: 'Parent',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    academicUpdates: true,
    attendanceAlerts: true,
    homeworkReminders: true,
    schoolAnnouncements: true,
    eventReminders: true,
    emergencyAlerts: true,
    paymentReminders: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    shareContactWithTeachers: true,
    receiveMarketingEmails: false,
    allowDataCollection: true,
    twoFactorAuth: false,
  });

  // App preferences
  const [appSettings, setAppSettings] = useState({
    darkMode: false,
    autoSync: true,
    soundEnabled: true,
    vibrationEnabled: true,
    language: 'English',
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof parentData) => {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          relation: data.relationship,
        })
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync(parentData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof parentData, value: string) => {
    setParentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (setting: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handlePrivacyChange = (setting: keyof PrivacySettings) => {
    setPrivacy(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleAppSettingChange = (setting: keyof typeof appSettings) => {
    setAppSettings(prev => ({
      ...prev,
      [setting]: typeof prev[setting] === 'boolean' ? !prev[setting] : prev[setting]
    }));
  };

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
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const ToggleSwitch = ({ value, onValueChange, disabled = false }: { 
    value: boolean; 
    onValueChange: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.switch,
        value && styles.switchActive,
        disabled && styles.switchDisabled
      ]}
      onPress={disabled ? undefined : onValueChange}
      disabled={disabled}
    >
      <View style={[
        styles.switchThumb,
        value && styles.switchThumbActive,
        disabled && styles.switchThumbDisabled
      ]} />
    </TouchableOpacity>
  );

  const SettingItem = ({ 
    title, 
    description, 
    icon, 
    value, 
    onValueChange, 
    disabled = false,
    type = 'switch'
  }: {
    title: string;
    description?: string;
    icon: string;
    value?: boolean;
    onValueChange?: () => void;
    disabled?: boolean;
    type?: 'switch' | 'chevron';
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={type === 'chevron' ? onValueChange : undefined}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary[100] }]}>
          <MaterialIcons name={icon as any} size={20} color={theme.colors.primary[600]} />
        </View>
        <View style={styles.settingText}>
          <Body weight="medium" style={styles.settingTitle}>{title}</Body>
          {description && (
            <Caption variant="secondary" style={styles.settingDescription}>{description}</Caption>
          )}
        </View>
      </View>
      {type === 'switch' && value !== undefined && onValueChange && (
        <ToggleSwitch value={value} onValueChange={onValueChange} disabled={disabled} />
      )}
      {type === 'chevron' && (
        <MaterialIcons name="chevron-right" size={20} color={theme.colors.text.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Heading1 style={styles.title}>Settings</Heading1>
            <Body variant="secondary" style={styles.subtitle}>
              Manage your profile, preferences, and account settings
            </Body>
          </View>
          
          <View style={styles.headerActions}>
            {isEditing ? (
              <View style={styles.editActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleSave}
                  disabled={isSaving}
                  style={{ marginLeft: theme.spacing.sm }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </View>
            ) : (
              <Button variant="primary" size="sm" onPress={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </View>
        </View>

        {/* User Profile Card */}
        <Card variant="default" style={styles.profileCard}>
          <CardContent style={styles.profileContent}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Heading2 style={styles.avatarText}>
                    {getInitials(user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'PA')}
                  </Heading2>
                </View>
              </View>
              <View style={styles.profileInfo}>
                <Heading3 style={styles.userName}>
                  {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Parent'}
                </Heading3>
                <Body variant="secondary" style={styles.userEmail}>{user?.email}</Body>
                <Caption variant="muted">Parent Account</Caption>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader style={styles.cardHeader}>
            <CardTitle style={styles.sectionTitle}>
              <MaterialIcons name="person" size={20} color={theme.colors.blue[500]} />
              <Heading3 style={styles.sectionTitleText}>Personal Information</Heading3>
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <View style={styles.inputGrid}>
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Body weight="medium" style={styles.inputLabel}>First Name</Body>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={parentData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    editable={isEditing}
                    placeholder="Enter first name"
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Body weight="medium" style={styles.inputLabel}>Last Name</Body>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={parentData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    editable={isEditing}
                    placeholder="Enter last name"
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Body weight="medium" style={styles.inputLabel}>Email Address</Body>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={parentData.email}
                  editable={false}
                  placeholder="Email cannot be changed"
                  placeholderTextColor={theme.colors.text.muted}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Body weight="medium" style={styles.inputLabel}>Primary Phone</Body>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={parentData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    editable={isEditing}
                    placeholder="Enter phone number"
                    placeholderTextColor={theme.colors.text.muted}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Body weight="medium" style={styles.inputLabel}>Relationship</Body>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={parentData.relationship}
                    onChangeText={(value) => handleInputChange('relationship', value)}
                    editable={isEditing}
                    placeholder="e.g., Father, Mother, Guardian"
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Body weight="medium" style={styles.inputLabel}>Occupation</Body>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={parentData.occupation}
                  onChangeText={(value) => handleInputChange('occupation', value)}
                  editable={isEditing}
                  placeholder="Enter your occupation"
                  placeholderTextColor={theme.colors.text.muted}
                />
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Children Information */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader style={styles.cardHeader}>
            <CardTitle style={styles.sectionTitle}>
              <MaterialIcons name="family-restroom" size={20} color={theme.colors.green[500]} />
              <Heading3 style={styles.sectionTitleText}>My Children</Heading3>
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            {children.length > 0 ? (
              <View style={styles.childrenContainer}>
                {children.map((child: any) => (
                  <View key={child.id} style={styles.childCard}>
                    <View style={styles.childAvatar}>
                      <MaterialIcons name="person" size={20} color={theme.colors.primary[500]} />
                    </View>
                    <View style={styles.childInfo}>
                      <Body weight="medium" style={styles.childName}>{child.full_name}</Body>
                      <Caption variant="secondary">
                        Grade {child.sections?.grade} • Section {child.sections?.section}
                      </Caption>
                      <Caption variant="muted">
                        Admission: {child.admission_no || 'N/A'}
                      </Caption>
                    </View>
                    <View style={styles.childStatus}>
                      <Caption style={styles.activeStatus}>Active</Caption>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={32} color={theme.colors.text.muted} />
                <Body variant="muted" style={styles.emptyText}>
                  No children found. Contact school administration.
                </Body>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader style={styles.cardHeader}>
            <CardTitle style={styles.sectionTitle}>
              <MaterialIcons name="notifications" size={20} color={theme.colors.orange[500]} />
              <Heading3 style={styles.sectionTitleText}>Notification Preferences</Heading3>
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <SettingItem
              title="Email Notifications"
              description="Receive notifications via email"
              icon="email"
              value={notifications.emailNotifications}
              onValueChange={() => handleNotificationChange('emailNotifications')}
            />
            <SettingItem
              title="SMS Notifications"
              description="Receive text message notifications"
              icon="sms"
              value={notifications.smsNotifications}
              onValueChange={() => handleNotificationChange('smsNotifications')}
            />
            <SettingItem
              title="Academic Updates"
              description="Notifications about grades and academic progress"
              icon="school"
              value={notifications.academicUpdates}
              onValueChange={() => handleNotificationChange('academicUpdates')}
            />
            <SettingItem
              title="Attendance Alerts"
              description="Daily attendance notifications"
              icon="event-available"
              value={notifications.attendanceAlerts}
              onValueChange={() => handleNotificationChange('attendanceAlerts')}
            />
            <SettingItem
              title="Homework Reminders"
              description="Reminders for homework assignments"
              icon="assignment"
              value={notifications.homeworkReminders}
              onValueChange={() => handleNotificationChange('homeworkReminders')}
            />
            <SettingItem
              title="School Announcements"
              description="Important school announcements"
              icon="campaign"
              value={notifications.schoolAnnouncements}
              onValueChange={() => handleNotificationChange('schoolAnnouncements')}
            />
            <SettingItem
              title="Event Reminders"
              description="Upcoming school events and activities"
              icon="event"
              value={notifications.eventReminders}
              onValueChange={() => handleNotificationChange('eventReminders')}
            />
            <SettingItem
              title="Emergency Alerts"
              description="Critical emergency notifications"
              icon="warning"
              value={notifications.emergencyAlerts}
              onValueChange={() => handleNotificationChange('emergencyAlerts')}
            />
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader style={styles.cardHeader}>
            <CardTitle style={styles.sectionTitle}>
              <MaterialIcons name="security" size={20} color={theme.colors.purple[500]} />
              <Heading3 style={styles.sectionTitleText}>Privacy & Security</Heading3>
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <SettingItem
              title="Share Contact with Teachers"
              description="Allow teachers to contact you directly"
              icon="contacts"
              value={privacy.shareContactWithTeachers}
              onValueChange={() => handlePrivacyChange('shareContactWithTeachers')}
            />
            <SettingItem
              title="Marketing Emails"
              description="Receive promotional emails about school services"
              icon="mark-email-read"
              value={privacy.receiveMarketingEmails}
              onValueChange={() => handlePrivacyChange('receiveMarketingEmails')}
            />
            <SettingItem
              title="Data Collection"
              description="Allow collection of usage data to improve services"
              icon="analytics"
              value={privacy.allowDataCollection}
              onValueChange={() => handlePrivacyChange('allowDataCollection')}
            />
            <SettingItem
              title="Two-Factor Authentication"
              description="Add extra security to your account"
              icon="security"
              value={privacy.twoFactorAuth}
              onValueChange={() => handlePrivacyChange('twoFactorAuth')}
            />
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader style={styles.cardHeader}>
            <CardTitle style={styles.sectionTitle}>
              <MaterialIcons name="tune" size={20} color={theme.colors.indigo[500]} />
              <Heading3 style={styles.sectionTitleText}>App Preferences</Heading3>
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <SettingItem
              title="Dark Mode"
              description="Use dark theme"
              icon="dark-mode"
              value={appSettings.darkMode}
              onValueChange={() => handleAppSettingChange('darkMode')}
            />
            <SettingItem
              title="Auto Sync"
              description="Automatically sync data when app opens"
              icon="sync"
              value={appSettings.autoSync}
              onValueChange={() => handleAppSettingChange('autoSync')}
            />
            <SettingItem
              title="Sound Effects"
              description="Play sounds for notifications"
              icon="volume-up"
              value={appSettings.soundEnabled}
              onValueChange={() => handleAppSettingChange('soundEnabled')}
            />
            <SettingItem
              title="Vibration"
              description="Vibrate for notifications"
              icon="vibration"
              value={appSettings.vibrationEnabled}
              onValueChange={() => handleAppSettingChange('vibrationEnabled')}
            />
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader style={styles.cardHeader}>
            <CardTitle style={styles.sectionTitle}>
              <MaterialIcons name="help" size={20} color={theme.colors.teal[500]} />
              <Heading3 style={styles.sectionTitleText}>Help & Support</Heading3>
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <SettingItem
              title="Help Center"
              description="Browse FAQs and help articles"
              icon="help-center"
              type="chevron"
              onValueChange={() => setShowHelpModal(true)}
            />
            <SettingItem
              title="Contact Support"
              description="Get help from our support team"
              icon="support-agent"
              type="chevron"
              onValueChange={() => Alert.alert('Contact Support', 'Email: support@school.edu\nPhone: +1 (555) 123-0000')}
            />
            <SettingItem
              title="About App"
              description="App version and information"
              icon="info"
              type="chevron"
              onValueChange={() => Alert.alert('Parent Portal', 'Version 1.0.0\n\nA comprehensive mobile app for parents to stay connected with their children\'s academic progress.')}
            />
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card variant="default" style={styles.signOutCard}>
          <CardContent style={styles.cardContent}>
            <Button
              variant="primary"
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <MaterialIcons name="logout" size={20} color={theme.colors.white} />
              <Body weight="medium" style={styles.signOutText}>Sign Out</Body>
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Caption variant="muted" style={styles.footerText}>
            Made with ❤️ for better education
          </Caption>
          <Caption variant="muted" style={styles.versionText}>
            Version 1.0.0
          </Caption>
        </View>
      </ScrollView>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Heading2 style={styles.modalTitle}>Help Center</Heading2>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.helpSection}>
              <Heading3 style={styles.helpSectionTitle}>Frequently Asked Questions</Heading3>
              
              <View style={styles.helpItem}>
                <Body weight="medium" style={styles.helpQuestion}>How do I update my profile?</Body>
                <Body style={styles.helpAnswer}>
                  Tap "Edit Profile" on the settings screen, make your changes, and tap "Save".
                </Body>
              </View>

              <View style={styles.helpItem}>
                <Body weight="medium" style={styles.helpQuestion}>How do I view my child's attendance?</Body>
                <Body style={styles.helpAnswer}>
                  Go to the Attendance tab to view daily attendance records and statistics.
                </Body>
              </View>

              <View style={styles.helpItem}>
                <Body weight="medium" style={styles.helpQuestion}>Can I turn off certain notifications?</Body>
                <Body style={styles.helpAnswer}>
                  Yes, you can customize notification preferences in the Settings under "Notification Preferences".
                </Body>
              </View>

              <View style={styles.helpItem}>
                <Body weight="medium" style={styles.helpQuestion}>How do I reset my password?</Body>
                <Body style={styles.helpAnswer}>
                  Contact your school administration or use the password reset option on the login screen.
                </Body>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.text.secondary,
  },
  headerActions: {
    marginLeft: theme.spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCard: {
    borderColor: theme.colors.border,
  },
  profileContent: {
    padding: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bold,
  },
  profileInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  userName: {
    color: theme.colors.text.primary,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
  },
  sectionCard: {
    borderColor: theme.colors.border,
  },
  cardHeader: {
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitleText: {
    color: theme.colors.text.primary,
  },
  inputGrid: {
    gap: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputContainer: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  inputLabel: {
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
  },
  inputDisabled: {
    backgroundColor: theme.colors.gray[50],
    color: theme.colors.text.muted,
  },
  childrenContainer: {
    gap: theme.spacing.md,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  childAvatar: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  childName: {
    color: theme.colors.text.primary,
  },
  childStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    backgroundColor: theme.colors.green[100],
    borderRadius: theme.borderRadius.sm,
  },
  activeStatus: {
    color: theme.colors.green[700],
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  settingTitle: {
    color: theme.colors.text.primary,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 18,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.gray[300],
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: theme.colors.primary[500],
  },
  switchDisabled: {
    opacity: 0.5,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  switchThumbDisabled: {
    backgroundColor: theme.colors.gray[200],
  },
     signOutCard: {
     borderColor: theme.colors.red[100],
     backgroundColor: theme.colors.red[50],
   },
  signOutButton: {
    backgroundColor: theme.colors.red[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  signOutText: {
    color: theme.colors.white,
  },
  footer: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.lg,
  },
  footerText: {
    textAlign: 'center',
  },
  versionText: {
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  helpSection: {
    gap: theme.spacing.lg,
  },
  helpSectionTitle: {
    color: theme.colors.text.primary,
  },
  helpItem: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  helpQuestion: {
    color: theme.colors.text.primary,
  },
  helpAnswer: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
}); 