'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Bell, Shield, BookOpen, Phone, Mail, Key, Save, AlertTriangle, GraduationCap } from 'lucide-react';
import { useState } from 'react';

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

export default function StudentSettings() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock student data
  const [studentData, setStudentData] = useState({
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'emily.johnson@student.school.edu',
    phone: '+1 (555) 123-4567',
    address: '456 Oak Street, Cityville, State 12345',
    emergencyContact: '+1 (555) 987-6543',
    grade: '10th Grade',
    section: 'A',
    studentId: 'STU2024001',
    rollNumber: '15',
    bloodGroup: 'B+',
    dateOfBirth: '2008-05-15',
  });

  // Academic information
  const academicInfo = {
    currentYear: '2024-2025',
    semester: 'Fall',
    subjects: ['Mathematics', 'English Literature', 'Physics', 'Chemistry', 'Biology', 'History'],
    gpa: '3.85',
    rank: '12th out of 150',
    status: 'Active'
  };

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    homeworkReminders: true,
    gradeUpdates: true,
    attendanceAlerts: true,
    schoolAnnouncements: true,
    examReminders: true,
    assignmentDeadlines: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'teachers_only',
    sharePerformanceWithParents: true,
    allowPeerMessaging: false,
    showOnlineStatus: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setStudentData(prev => ({
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

  const handlePrivacyChange = (setting: string, value: boolean | string) => {
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
          <h1 className="text-3xl font-bold text-gray-900">Student Settings</h1>
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
                value={studentData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={studentData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Student Email</Label>
              <Input
                id="email"
                type="email"
                value={studentData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={true} // Email usually can't be changed
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={studentData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={studentData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                disabled={true} // DOB usually can't be changed
              />
            </div>
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                value={studentData.bloodGroup}
                onValueChange={(value) => handleInputChange('bloodGroup', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={studentData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          
          <div>
            <Label htmlFor="emergencyContact">Emergency Contact</Label>
            <Input
              id="emergencyContact"
              value={studentData.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Academic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{studentData.grade}</div>
              <div className="text-sm text-gray-600">Grade</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Section {studentData.section}</div>
              <div className="text-sm text-gray-600">Class Section</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{academicInfo.gpa}</div>
              <div className="text-sm text-gray-600">Current GPA</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{studentData.rollNumber}</div>
              <div className="text-sm text-gray-600">Roll Number</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Student Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student ID:</span>
                  <span className="font-medium">{studentData.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Academic Year:</span>
                  <span className="font-medium">{academicInfo.currentYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Semester:</span>
                  <span className="font-medium">{academicInfo.semester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Class Rank:</span>
                  <span className="font-medium">{academicInfo.rank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {academicInfo.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Subjects Enrolled</h4>
              <div className="grid grid-cols-2 gap-2">
                {academicInfo.subjects.map((subject, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded text-center">
                    {subject}
                  </div>
                ))}
              </div>
            </div>
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
                  <span className="text-sm">Homework Reminders</span>
                  <Switch
                    checked={notifications.homeworkReminders}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('homeworkReminders', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Grade Updates</span>
                  <Switch
                    checked={notifications.gradeUpdates}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('gradeUpdates', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Attendance Alerts</span>
                  <Switch
                    checked={notifications.attendanceAlerts}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('attendanceAlerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">School Announcements</span>
                  <Switch
                    checked={notifications.schoolAnnouncements}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('schoolAnnouncements', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Exam Reminders</span>
                  <Switch
                    checked={notifications.examReminders}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('examReminders', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Assignment Deadlines</span>
                  <Switch
                    checked={notifications.assignmentDeadlines}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('assignmentDeadlines', checked)}
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
                <p className="font-medium">Profile Visibility</p>
                <p className="text-sm text-gray-600">Who can see your profile information</p>
              </div>
              <Select
                value={privacy.profileVisibility}
                onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teachers_only">Teachers Only</SelectItem>
                  <SelectItem value="classmates">Classmates</SelectItem>
                  <SelectItem value="school_community">School Community</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Share Performance with Parents</p>
                <p className="text-sm text-gray-600">Allow parents to view your grades and progress</p>
              </div>
              <Switch
                checked={privacy.sharePerformanceWithParents}
                onCheckedChange={(checked: boolean) => handlePrivacyChange('sharePerformanceWithParents', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Allow Peer Messaging</p>
                <p className="text-sm text-gray-600">Let other students send you messages</p>
              </div>
              <Switch
                checked={privacy.allowPeerMessaging}
                onCheckedChange={(checked: boolean) => handlePrivacyChange('allowPeerMessaging', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show Online Status</p>
                <p className="text-sm text-gray-600">Display when you're online to others</p>
              </div>
              <Switch
                checked={privacy.showOnlineStatus}
                onCheckedChange={(checked: boolean) => handlePrivacyChange('showOnlineStatus', checked)}
              />
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
              <BookOpen className="w-4 h-4 mr-2" />
              Download Transcript
            </Button>
          </div>
          
          <Separator />
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Student Account</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Some settings may require approval from your parents or teachers. 
                  Contact your school administrator for assistance with account management.
                </p>
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
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Student Handbook</h4>
              <p className="text-sm text-gray-600 mt-1">Guidelines & Policies</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Mail className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Contact Counselor</h4>
              <p className="text-sm text-gray-600 mt-1">Academic Support</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">IT Support</h4>
              <p className="text-sm text-gray-600 mt-1">Technical Help</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 