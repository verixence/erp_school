'use client';

import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Award,
  Target,
  Bell,
  User,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';

interface StudentAttendanceStats {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number;
  grade_letter: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes?: string;
  period_number?: number;
  subject?: string;
  recorded_by: string;
  teacher_name?: string;
}

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  grace_period_minutes: number;
}

interface AttendanceNotification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  attendance_record_id: string;
}

export default function EnhancedStudentAttendance() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  
  // Calculate date range
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
        .select('*')
        .eq('school_id', user.school_id)
        .single();

      if (error) {
        return {
          attendance_mode: 'daily',
          notify_parents: true,
          grace_period_minutes: 15,
        };
      }
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Fetch enhanced attendance stats
  const { data: attendanceStats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-attendance-stats', user?.id, start, end],
    queryFn: async (): Promise<StudentAttendanceStats> => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .rpc('get_student_attendance_percentage', {
          student_id_param: user.id,
          date_from: start,
          date_to: end
        });

      if (error) throw error;
      return data?.[0] || {
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        excused_days: 0,
        attendance_percentage: 0,
        grade_letter: 'N/A'
      };
    },
    enabled: !!user?.id,
  });

  // Fetch detailed attendance records
  const { data: attendanceRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['student-attendance-records', user?.id, start, end],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          date,
          status,
          notes,
          period_number,
          subject,
          recorded_by,
          users!attendance_records_recorded_by_fkey(first_name, last_name)
        `)
        .eq('student_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(record => ({
        id: record.id,
        date: record.date,
        status: record.status,
        notes: record.notes,
        period_number: record.period_number,
        subject: record.subject,
        recorded_by: record.recorded_by,
        teacher_name: record.users ? `${(record.users as any).first_name} ${(record.users as any).last_name}` : 'Unknown'
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch attendance notifications
  const { data: notifications } = useQuery({
    queryKey: ['attendance-notifications', user?.id],
    queryFn: async (): Promise<AttendanceNotification[]> => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('attendance_notifications')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getAttendanceGrade = (percentage: number) => {
    if (percentage >= 95) return { grade: 'A+', color: 'text-green-600', icon: Award };
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600', icon: Award };
    if (percentage >= 85) return { grade: 'B+', color: 'text-blue-600', icon: Target };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600', icon: Target };
    if (percentage >= 75) return { grade: 'C+', color: 'text-yellow-600', icon: AlertTriangle };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600', icon: AlertTriangle };
    return { grade: 'D', color: 'text-red-600', icon: AlertTriangle };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50 border-green-200';
      case 'absent': return 'text-red-600 bg-red-50 border-red-200';
      case 'late': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'excused': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const attendanceGrade = attendanceStats ? getAttendanceGrade(attendanceStats.attendance_percentage) : null;

  if (statsLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-8 w-8" />
            My Attendance
          </h1>
          <p className="text-muted-foreground">
            Track your attendance records and performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={settings?.attendance_mode === 'per_period' ? 'default' : 'secondary'}>
            {settings?.attendance_mode === 'per_period' ? 'Period-wise tracking' : 'Daily tracking'}
          </Badge>
          
          <Select value={dateRange} onValueChange={(value: 'week' | 'month' | 'quarter') => setDateRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Stats */}
      {attendanceStats && attendanceGrade && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Percentage Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Overall Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {attendanceStats.attendance_percentage.toFixed(1)}%
                  </div>
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${attendanceGrade.color} bg-current/10`}>
                    <attendanceGrade.icon className="h-4 w-4" />
                    Grade {attendanceGrade.grade}
                  </div>
                </div>
                
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - attendanceStats.attendance_percentage / 100)}`}
                      className="text-primary transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {attendanceStats.attendance_percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Breakdown Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{attendanceStats.present_days}</div>
                    <div className="text-sm text-green-600">Present</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                    <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{attendanceStats.absent_days}</div>
                    <div className="text-sm text-red-600">Absent</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late_days}</div>
                    <div className="text-sm text-yellow-600">Late</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <AlertTriangle className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{attendanceStats.excused_days}</div>
                    <div className="text-sm text-blue-600">Excused</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Total tracking period: <span className="font-medium">{attendanceStats.total_days} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Recent Records and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Records */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {attendanceRecords.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium">
                            {format(new Date(record.date), 'EEEE, MMM do')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {settings?.attendance_mode === 'per_period' && record.period_number ? (
                              <>Period {record.period_number} • {record.subject || 'N/A'}</>
                            ) : (
                              'Daily attendance'
                            )}
                            {record.teacher_name && (
                              <> • by {record.teacher_name}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(record.status)} variant="outline">
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Records Found</h3>
                  <p className="text-gray-600">
                    No attendance records found for the selected period.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Notifications */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-3 border rounded-lg ${notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start gap-3">
                        <Bell className={`h-4 w-4 mt-1 ${notification.is_read ? 'text-gray-400' : 'text-blue-500'}`} />
                        <div className="flex-1">
                          <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(notification.created_at), 'MMM do, yyyy • h:mm a')}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
                  <p className="text-gray-600">
                    You don't have any attendance notifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 