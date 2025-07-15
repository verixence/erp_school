'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Settings, 
  Clock, 
  Calendar, 
  Bell, 
  Users, 
  Shield,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface AttendanceSettings {
  id?: string;
  school_id: string;
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  notification_delay_minutes: number;
  auto_mark_present: boolean;
  grace_period_minutes: number;
  weekend_attendance: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function AttendanceSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<AttendanceSettings>({
    school_id: user?.school_id || '',
    attendance_mode: 'daily',
    notify_parents: true,
    notification_delay_minutes: 30,
    auto_mark_present: false,
    grace_period_minutes: 15,
    weekend_attendance: false,
  });

  // Fetch current attendance settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .eq('school_id', user.school_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const result = data || {
        school_id: user.school_id,
        attendance_mode: 'daily' as const,
        notify_parents: true,
        notification_delay_minutes: 30,
        auto_mark_present: false,
        grace_period_minutes: 15,
        weekend_attendance: false,
      };

      setSettings(result);
      return result;
    },
    enabled: !!user?.school_id,
  });

  // Save attendance settings
  const saveSettings = useMutation({
    mutationFn: async (newSettings: AttendanceSettings) => {
      if (!user?.school_id) throw new Error('No school ID');

      const { error } = await supabase
        .from('attendance_settings')
        .upsert({
          ...newSettings,
          school_id: user.school_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  const handleSave = () => {
    saveSettings.mutate(settings);
  };

  const handleChange = <K extends keyof AttendanceSettings>(
    key: K,
    value: AttendanceSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Attendance Settings
          </h1>
          <p className="text-muted-foreground">
            Configure how attendance is tracked and managed in your school
          </p>
        </div>
        <Badge variant={settings.attendance_mode === 'per_period' ? 'default' : 'secondary'}>
          {settings.attendance_mode === 'per_period' ? 'Period Mode' : 'Daily Mode'}
        </Badge>
      </div>

      {/* Attendance Mode Setting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Tracking Mode
            </CardTitle>
            <CardDescription>
              Choose how teachers mark attendance in your school
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  settings.attendance_mode === 'daily' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleChange('attendance_mode', 'daily')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Daily Attendance</span>
                  {settings.attendance_mode === 'daily' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Teachers mark attendance once per day for their assigned classes.
                  Simple and straightforward for most schools.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Quick to mark</Badge>
                  <Badge variant="outline" className="text-xs">Class-based</Badge>
                  <Badge variant="outline" className="text-xs">Simple reports</Badge>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  settings.attendance_mode === 'per_period' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleChange('attendance_mode', 'per_period')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">Period-wise Attendance</span>
                  {settings.attendance_mode === 'per_period' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Teachers mark attendance for each period/subject they teach.
                  Detailed tracking for comprehensive reporting.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Subject-specific</Badge>
                  <Badge variant="outline" className="text-xs">Detailed reports</Badge>
                  <Badge variant="outline" className="text-xs">Timetable-based</Badge>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Switching Modes</p>
                  <p className="text-blue-700">
                    You can switch between modes at any time. Existing attendance data will be preserved 
                    and displayed appropriately in the new mode.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Parent Notifications
            </CardTitle>
            <CardDescription>
              Configure how parents are notified about attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-parents">Enable Parent Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to parents when their child is marked absent
                </p>
              </div>
              <Switch
                id="notify-parents"
                checked={settings.notify_parents}
                onCheckedChange={(checked) => handleChange('notify_parents', checked)}
              />
            </div>

            {settings.notify_parents && (
              <div className="space-y-2">
                <Label htmlFor="notification-delay">Notification Delay (minutes)</Label>
                <Input
                  id="notification-delay"
                  type="number"
                  min="0"
                  max="60"
                  value={settings.notification_delay_minutes}
                  onChange={(e) => handleChange('notification_delay_minutes', parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  How long to wait before sending absence notifications
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Advanced Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Advanced Settings
            </CardTitle>
            <CardDescription>
              Additional configuration options for attendance management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-mark-present">Auto-mark Present</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically mark students as present if not marked by teachers
                </p>
              </div>
              <Switch
                id="auto-mark-present"
                checked={settings.auto_mark_present}
                onCheckedChange={(checked) => handleChange('auto_mark_present', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grace-period">Grace Period (minutes)</Label>
              <Input
                id="grace-period"
                type="number"
                min="0"
                max="60"
                value={settings.grace_period_minutes}
                onChange={(e) => handleChange('grace_period_minutes', parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Time teachers have to mark attendance before it's considered late
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="weekend-attendance">Weekend Attendance</Label>
                <p className="text-sm text-muted-foreground">
                  Allow attendance marking on weekends and holidays
                </p>
              </div>
              <Switch
                id="weekend-attendance"
                checked={settings.weekend_attendance}
                onCheckedChange={(checked) => handleChange('weekend_attendance', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Warning for Period Mode */}
      {settings.attendance_mode === 'per_period' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900">Period Mode Requirements</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    For period-wise attendance to work properly, ensure that:
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Teachers are assigned to specific periods in the timetable</li>
                    <li>Class schedules are properly configured</li>
                    <li>Teachers understand they need to mark attendance for each period</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveSettings.isPending}
          size="lg"
          className="px-8"
        >
          {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
} 