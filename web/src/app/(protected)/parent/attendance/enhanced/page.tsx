'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  FileX,
  AlertTriangle,
  Award,
  Target
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period_number?: number;
  subject?: string;
  notes?: string;
}

interface AttendancePercentage {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number;
}

interface AttendanceNotification {
  id: string;
  message: string;
  notification_type: 'absent' | 'late' | 'excused';
  created_at: string;
  attendance_record: {
    date: string;
    status: string;
    subject?: string;
    period_number?: number;
  };
}

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
}

export default function EnhancedParentAttendancePage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Fetch children
  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            admission_no,
            grade,
            section
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        grade: item.students.grade,
        section: item.students.section
      }));
    },
    enabled: !!user?.id,
  });

  // Set default child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Get date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: format(startOfWeek(today), 'yyyy-MM-dd'),
          end: format(endOfWeek(today), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'quarter':
        return {
          start: format(subDays(today, 90), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'year':
        return {
          start: format(subDays(today, 365), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
    }
  };

  const { start, end } = getDateRange();

  // Fetch attendance settings
  const { data: settings } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .from('attendance_settings')
        .select('attendance_mode, notify_parents')
        .eq('school_id', user.school_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Fetch attendance percentage
  const { data: attendanceStats } = useQuery({
    queryKey: ['student-attendance-percentage', selectedChild, start, end],
    queryFn: async (): Promise<AttendancePercentage> => {
      if (!selectedChild) throw new Error('No child selected');

      const { data, error } = await supabase
        .rpc('get_student_attendance_percentage', {
          student_id_param: selectedChild,
          start_date: start,
          end_date: end
        });

      if (error) throw error;
      
      return data?.[0] || {
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        excused_days: 0,
        attendance_percentage: 0
      };
    },
    enabled: !!selectedChild,
  });

  // Fetch attendance records
  const { data: attendanceRecords } = useQuery({
    queryKey: ['student-attendance-records', selectedChild, start, end],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', selectedChild)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChild,
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['attendance-notifications', user?.id, selectedChild],
    queryFn: async (): Promise<AttendanceNotification[]> => {
      if (!user?.id || !selectedChild) return [];

      const { data, error } = await supabase
        .from('attendance_notifications')
        .select(`
          *,
          attendance_record:attendance_records!inner(
            date,
            status,
            subject,
            period_number
          )
        `)
        .eq('parent_id', user.id)
        .eq('student_id', selectedChild)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!selectedChild,
  });

  const selectedChildData = children?.find(child => child.id === selectedChild);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'excused': return <FileX className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAttendanceGrade = (percentage: number) => {
    if (percentage >= 95) return { grade: 'A+', color: 'text-green-600', icon: Award };
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600', icon: Award };
    if (percentage >= 85) return { grade: 'B+', color: 'text-blue-600', icon: Target };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600', icon: Target };
    if (percentage >= 75) return { grade: 'C+', color: 'text-yellow-600', icon: AlertTriangle };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600', icon: AlertTriangle };
    return { grade: 'D', color: 'text-red-600', icon: AlertTriangle };
  };

  const attendanceGrade = getAttendanceGrade(attendanceStats?.attendance_percentage || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Child Attendance
          </h1>
          <p className="text-muted-foreground">
            Monitor your child's attendance and receive notifications
          </p>
        </div>
        <Badge variant={settings?.attendance_mode === 'per_period' ? 'default' : 'secondary'}>
          {settings?.attendance_mode === 'per_period' ? 'Period-wise tracking' : 'Daily tracking'}
        </Badge>
      </div>

      {/* Child and Date Range Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Child</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children?.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    <div>
                      <div className="font-medium">{child.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Grade {child.grade}-{child.section} • {child.admission_no}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedChildData && attendanceStats && (
        <>
          {/* Attendance Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Attendance Percentage */}
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendance Percentage</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-4xl font-bold text-gray-900">
                        {attendanceStats.attendance_percentage.toFixed(1)}%
                      </p>
                      <div className={`flex items-center gap-1 ${attendanceGrade.color}`}>
                        <attendanceGrade.icon className="h-5 w-5" />
                        <span className="font-semibold">{attendanceGrade.grade}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {attendanceStats.present_days + attendanceStats.late_days} out of {attendanceStats.total_days} days
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-24 h-24 relative">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - (attendanceStats.attendance_percentage / 100))}`}
                          className={attendanceStats.attendance_percentage >= 90 ? 'text-green-600' : 
                                   attendanceStats.attendance_percentage >= 75 ? 'text-blue-600' : 'text-red-600'}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">
                          {Math.round(attendanceStats.attendance_percentage)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Days */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Days</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.total_days}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Present Days */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.present_days}</p>
                    <p className="text-xs text-muted-foreground">
                      {attendanceStats.late_days > 0 && `+${attendanceStats.late_days} late`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Absent</span>
                  </div>
                  <span className="text-xl font-bold">{attendanceStats.absent_days}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Late</span>
                  </div>
                  <span className="text-xl font-bold">{attendanceStats.late_days}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileX className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Excused</span>
                  </div>
                  <span className="text-xl font-bold">{attendanceStats.excused_days}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Attendance
              </CardTitle>
              <CardDescription>
                Latest attendance records for {selectedChildData.full_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceRecords?.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        {settings?.attendance_mode === 'per_period' && record.subject && (
                          <p className="text-sm text-muted-foreground">
                            Period {record.period_number} - {record.subject}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-sm text-muted-foreground">{record.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                ))}

                {(!attendanceRecords || attendanceRecords.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found for the selected period.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          {notifications && notifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Notifications
                </CardTitle>
                <CardDescription>
                  Attendance alerts for {selectedChildData.full_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <div className="mt-0.5">
                        {getStatusIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{notification.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(notification.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No child selected message */}
      {!selectedChild && children && children.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Child</h3>
            <p className="text-muted-foreground">
              Please select a child to view their attendance information.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No children message */}
      {children && children.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Children Found</h3>
            <p className="text-muted-foreground">
              No children are associated with your account. Please contact the school administration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 