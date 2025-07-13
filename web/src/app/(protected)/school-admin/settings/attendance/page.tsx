'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Clock, 
  Bell, 
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AttendanceSettings {
  id: string;
  school_id: string;
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  notification_delay_minutes: number;
  auto_mark_present: boolean;
  grace_period_minutes: number;
  weekend_attendance: boolean;
  created_at: string;
  updated_at: string;
}

export default function AttendanceSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current attendance settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .eq('school_id', user.school_id)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('attendance_settings')
            .insert({
              school_id: user.school_id,
              attendance_mode: 'daily',
              notify_parents: true,
              notification_delay_minutes: 30,
              auto_mark_present: false,
              grace_period_minutes: 15,
              weekend_attendance: false
            })
            .select()
            .single();

          if (createError) throw createError;
          return newSettings;
        }
        throw error;
      }

      return data;
    },
    enabled: !!user?.school_id,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<AttendanceSettings>>({});

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AttendanceSettings>) => {
      if (!user?.school_id) throw new Error('No school ID');

      const { error } = await supabase
        .from('attendance_settings')
        .update(updatedSettings)
        .eq('school_id', user.school_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attendance settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof AttendanceSettings, value: any) => {
    setFormData((prev: Partial<AttendanceSettings>) => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading attendance settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      </div>

      <div className="grid gap-6">
        {/* Attendance Mode Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Mode
            </CardTitle>
            <CardDescription>
              Choose how attendance is tracked in your school
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Attendance Tracking Mode</Label>
              <Select
                value={formData.attendance_mode || 'daily'}
                onValueChange={(value: 'daily' | 'per_period') => 
                  handleInputChange('attendance_mode', value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Daily Attendance</div>
                        <div className="text-xs text-muted-foreground">
                          Class teachers mark attendance once per day
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="per_period">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Per-Period Attendance</div>
                        <div className="text-xs text-muted-foreground">
                          Subject teachers mark attendance every period
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Mode-specific information */}
              {formData.attendance_mode === 'daily' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Daily Attendance Mode</h4>
                      <p className="text-sm text-blue-700">
                        • Only class teachers can mark attendance for their assigned sections<br/>
                        • Attendance is marked once per day<br/>
                        • Cannot mark attendance for future dates<br/>
                        • Suitable for schools with homeroom-based systems
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {formData.attendance_mode === 'per_period' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900">Per-Period Attendance Mode</h4>
                      <p className="text-sm text-amber-700">
                        • Subject teachers mark attendance for each period they teach<br/>
                        • Only teachers assigned to specific periods can mark attendance<br/>
                        • Based on your timetable configuration<br/>
                        • Cannot mark attendance for future dates<br/>
                        • More detailed tracking but requires more effort
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekend Attendance</Label>
                  <p className="text-sm text-muted-foreground">
                    Track attendance on Saturdays and Sundays
                  </p>
                </div>
                <Switch
                  checked={formData.weekend_attendance || false}
                  onCheckedChange={(checked) => 
                    handleInputChange('weekend_attendance', checked)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Grace Period (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.grace_period_minutes || 15}
                  onChange={(e) => 
                    handleInputChange('grace_period_minutes', parseInt(e.target.value))
                  }
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  How long after class starts students can still be marked present
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Parent Notifications
            </CardTitle>
            <CardDescription>
              Configure automatic notifications to parents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Parent Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically notify parents when their child is marked absent, late, or excused
                </p>
              </div>
              <Switch
                checked={formData.notify_parents || false}
                onCheckedChange={(checked) => 
                  handleInputChange('notify_parents', checked)
                }
              />
            </div>

            {formData.notify_parents && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                <div className="space-y-2">
                  <Label>Notification Delay (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.notification_delay_minutes || 30}
                    onChange={(e) => 
                      handleInputChange('notification_delay_minutes', parseInt(e.target.value))
                    }
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Wait time before sending notifications (helps avoid false alerts during attendance taking)
                  </p>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Parents will be notified for: Absent, Late, and Excused statuses
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Automation Settings
            </CardTitle>
            <CardDescription>
              Configure automatic attendance behaviors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-mark Present</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically mark students as present if not marked by end of day
                </p>
              </div>
              <Switch
                checked={formData.auto_mark_present || false}
                onCheckedChange={(checked) => 
                  handleInputChange('auto_mark_present', checked)
                }
              />
            </div>

            {formData.auto_mark_present && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>Note:</strong> This will mark all unmarked students as present at the end of each day. 
                    Use with caution as it may mask actual absences.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="px-6"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
} 