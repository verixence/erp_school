'use client';

import { useAuth } from '@/hooks/use-auth';
import { useChildren } from '@/hooks/use-parent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Bell, Shield, Users, Phone, Mail, Key, Save, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

// Simple Switch Component
const Switch = ({ checked, onCheckedChange, ...props }: { 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void;
  [key: string]: any;
}) => (
  <button
    {...props}
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// Simple Separator Component
const Separator = ({ className = '', ...props }: { className?: string; [key: string]: any }) => (
  <hr {...props} className={`border-t border-gray-200 my-4 ${className}`} />
);

export default function ParentSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get real children data
  const { data: children = [] } = useChildren(user?.id);

  // Real parent data from authenticated user
  const [parentData, setParentData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    alternatePhone: '',
    address: '',
    occupation: '',
    relationship: user?.relation || '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
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
  const [privacy, setPrivacy] = useState({
    shareContactWithTeachers: true,
    receiveMarketingEmails: false,
    allowDataCollection: true,
    twoFactorAuth: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
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
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
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

  const handleInputChange = (field: string, value: string) => {
    setParentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (setting: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handlePrivacyChange = (setting: string, value: boolean) => {
    setPrivacy(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile, preferences, and account settings.
          </p>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={parentData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={parentData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={parentData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Primary Phone</Label>
              <Input
                id="phone"
                value={parentData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="alternatePhone">Alternate Phone</Label>
              <Input
                id="alternatePhone"
                value={parentData.alternatePhone}
                onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship to Student</Label>
              <Select
                value={parentData.relationship}
                onValueChange={(value) => handleInputChange('relationship', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={parentData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          
          <div>
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={parentData.occupation}
              onChange={(e) => handleInputChange('occupation', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Children Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Children
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {children.map((child: any) => (
              <div key={child.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-lg">{child.full_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Grade {child.sections?.grade} - Section {child.sections?.section}</span>
                      <span>Admission No: {child.admission_no || 'N/A'}</span>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </div>
            ))}
            {children.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No children found. Please contact school administration.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Communication Methods</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span>Email Notifications</span>
                </div>
                                 <Switch
                   checked={notifications.emailNotifications}
                   onCheckedChange={(checked: boolean) => handleNotificationChange('emailNotifications', checked)}
                 />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span>SMS Notifications</span>
                </div>
                                 <Switch
                   checked={notifications.smsNotifications}
                   onCheckedChange={(checked: boolean) => handleNotificationChange('smsNotifications', checked)}
                 />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Notification Types</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Academic Updates</span>
                  <Switch
                    checked={notifications.academicUpdates}
                    onCheckedChange={(checked) => handleNotificationChange('academicUpdates', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Attendance Alerts</span>
                  <Switch
                    checked={notifications.attendanceAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('attendanceAlerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Homework Reminders</span>
                  <Switch
                    checked={notifications.homeworkReminders}
                    onCheckedChange={(checked) => handleNotificationChange('homeworkReminders', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">School Announcements</span>
                  <Switch
                    checked={notifications.schoolAnnouncements}
                    onCheckedChange={(checked) => handleNotificationChange('schoolAnnouncements', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Event Reminders</span>
                  <Switch
                    checked={notifications.eventReminders}
                    onCheckedChange={(checked) => handleNotificationChange('eventReminders', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Emergency Alerts</span>
                  <Switch
                    checked={notifications.emergencyAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('emergencyAlerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Reminders</span>
                  <Switch
                    checked={notifications.paymentReminders}
                    onCheckedChange={(checked) => handleNotificationChange('paymentReminders', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Share Contact Info with Teachers</p>
                <p className="text-sm text-gray-600">Allow teachers to contact you directly</p>
              </div>
              <Switch
                checked={privacy.shareContactWithTeachers}
                onCheckedChange={(checked) => handlePrivacyChange('shareContactWithTeachers', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-gray-600">Receive promotional emails about school services</p>
              </div>
              <Switch
                checked={privacy.receiveMarketingEmails}
                onCheckedChange={(checked) => handlePrivacyChange('receiveMarketingEmails', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Collection</p>
                <p className="text-sm text-gray-600">Allow collection of usage data to improve services</p>
              </div>
              <Switch
                checked={privacy.allowDataCollection}
                onCheckedChange={(checked) => handlePrivacyChange('allowDataCollection', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <div className="flex items-center gap-2">
                {privacy.twoFactorAuth && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Enabled
                  </Badge>
                )}
                <Switch
                  checked={privacy.twoFactorAuth}
                  onCheckedChange={(checked) => handlePrivacyChange('twoFactorAuth', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Account Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button variant="outline" className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Update Email
            </Button>
          </div>
          
          <Separator />
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Danger Zone</h4>
                <p className="text-sm text-red-700 mt-1">
                  These actions are permanent and cannot be undone.
                </p>
                <div className="mt-3 space-y-2">
                  <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                    Deactivate Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>Help & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Phone className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Call Support</h4>
              <p className="text-sm text-gray-600 mt-1">+1 (555) 123-0000</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Mail className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Email Support</h4>
              <p className="text-sm text-gray-600 mt-1">support@school.edu</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Help Center</h4>
              <p className="text-sm text-gray-600 mt-1">Browse FAQs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 