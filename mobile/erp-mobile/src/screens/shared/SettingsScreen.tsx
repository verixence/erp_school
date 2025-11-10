import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { supabase } from '../../services/supabase';
import {
  Bell,
  LogOut,
  ChevronRight,
  Settings as SettingsIcon,
  Info,
  User,
  Lock,
  Palette
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen: React.FC = () => {
  const { user, signOut, isTeacher, isParent } = useAuth();
  const navigation = useNavigation();
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

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

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setEditingProfile(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert('Success', 'Password changed successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    {
      title: 'Profile & Account',
      items: [
        {
          title: 'Edit Profile',
          description: 'Update your personal information',
          icon: User,
          onPress: () => setEditingProfile(true),
          color: '#3B82F6'
        },
        {
          title: 'Change Password',
          description: 'Update your password',
          icon: Lock,
          onPress: () => setChangingPassword(true),
          color: '#8B5CF6'
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          title: 'Notifications',
          description: 'Manage notification preferences',
          icon: Bell,
          onPress: () => {
            // Check if NotificationSettings screen exists in navigation
            if ((navigation as any).navigate) {
              try {
                (navigation as any).navigate('NotificationSettings');
              } catch {
                Alert.alert('Coming Soon', 'Notification settings will be available soon');
              }
            }
          },
          color: '#F59E0B'
        },
        {
          title: 'Theme',
          description: 'Customize app appearance',
          icon: Palette,
          onPress: () => {
            if ((navigation as any).navigate) {
              try {
                (navigation as any).navigate('ThemeSettings');
              } catch {
                Alert.alert('Coming Soon', 'Theme settings will be available soon');
              }
            }
          },
          color: '#10B981'
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          title: 'About',
          description: 'Version 1.0.0',
          icon: Info,
          onPress: () => Alert.alert(
            'Campus Hoster',
            'Version 1.0.0\n\nA comprehensive school management system designed to streamline communication between teachers, parents, and administrators.\n\nBuilt with ❤️ for education\n\nDeveloped by verixence.com'
          ),
          color: '#6B7280'
        }
      ]
    }
  ];

  // Profile Edit Modal
  if (editingProfile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <StatusBar style="dark" />
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setEditingProfile(false)}
                style={{ marginRight: 16 }}
              >
                <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 }}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={loading}
              >
                <Text style={{
                  color: loading ? '#9CA3AF' : '#6366F1',
                  fontSize: 16,
                  fontWeight: '600'
                }}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    First Name *
                  </Text>
                  <RNTextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter first name"
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Last Name *
                  </Text>
                  <RNTextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter last name"
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Phone Number
                  </Text>
                  <RNTextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Email Address
                  </Text>
                  <RNTextInput
                    value={user?.email || ''}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#9CA3AF',
                      backgroundColor: '#F9FAFB'
                    }}
                  />
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Email cannot be changed
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Password Change Modal
  if (changingPassword) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <StatusBar style="dark" />
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => {
                  setChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={{ marginRight: 16 }}
              >
                <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 }}>
                Change Password
              </Text>
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={{
                  color: loading ? '#9CA3AF' : '#6366F1',
                  fontSize: 16,
                  fontWeight: '600'
                }}>
                  {loading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    New Password *
                  </Text>
                  <RNTextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 8 characters)"
                    secureTextEntry
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Confirm New Password *
                  </Text>
                  <RNTextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                <View style={{
                  backgroundColor: '#FEF3C7',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 8
                }}>
                  <Text style={{ fontSize: 13, color: '#92400E' }}>
                    Password must be at least 8 characters long
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
              Manage your account and preferences
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 20 }}>
        {/* User Profile Card */}
        <View style={{ marginBottom: 24 }}>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                  <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                    {user?.email}
                  </Text>
                  <View style={{
                    backgroundColor: isTeacher ? '#dbeafe' : '#dcfce7',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 16,
                    alignSelf: 'flex-start'
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isTeacher ? '#1d4ed8' : '#16a34a'
                    }}>
                      {isTeacher ? 'Teacher' : 'Parent'}
                    </Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12, marginLeft: 4 }}>
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
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: '#f3f4f6'
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${item.color}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14
                    }}>
                      <item.icon size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 }}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#6b7280' }}>
                        {item.description}
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#9CA3AF" />
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
