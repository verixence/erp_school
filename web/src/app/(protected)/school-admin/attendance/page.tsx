'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Calendar, 
  Users, 
  Settings,
  BarChart3,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Download,
  Filter,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import AttendanceMetrics from '../dashboard/components/AttendanceMetrics';

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  grace_period_minutes: number;
  auto_mark_present: boolean;
}

interface AttendancePivotData {
  student_id: string;
  student_name: string;
  admission_no: string;
  grade: string;
  section: string;
  attendance_data: Record<string, {
    status: 'present' | 'absent' | 'late' | 'excused' | 'no_record';
    notes: string | null;
    recorded_by: string | null;
  }>;
}

interface AttendanceStats {
  total_students: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
}

export default function SchoolAdminAttendanceHub() {
  const { user } = useAuth();
  
  // Set default dates to match the data range (July 8-15, 2025)
  const [startDate, setStartDate] = useState<string>('2025-07-08');
  const [endDate, setEndDate] = useState<string>('2025-07-15');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Fetch attendance settings
  const { data: attendanceSettings } = useQuery({
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
          auto_mark_present: false,
        };
      }
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Fetch attendance pivot data
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-pivot', user?.school_id, startDate, endDate, attendanceSettings?.attendance_mode === 'per_period'],
    queryFn: async (): Promise<AttendancePivotData[]> => {
      if (!user?.school_id) throw new Error('No school ID');

      const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

      const { data, error } = await supabase
        .rpc(isPeriodMode ? 'attendance_pivot_period' : 'attendance_pivot', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id,
          is_period_mode: isPeriodMode
        });

      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user?.school_id,
  });

  // Fetch attendance statistics
  const { data: stats } = useQuery({
    queryKey: ['attendance-stats', user?.school_id, startDate, endDate, gradeFilter, sectionFilter, attendanceSettings?.attendance_mode === 'per_period'],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!user?.school_id) throw new Error('No school ID');

      const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

      const { data, error } = await supabase
        .rpc(isPeriodMode ? 'get_enhanced_attendance_stats_period' : 'get_enhanced_attendance_stats', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id,
          grade_filter: gradeFilter === 'all' ? null : gradeFilter,
          section_filter: sectionFilter === 'all' ? null : sectionFilter,
          is_period_mode: isPeriodMode
        });

      if (error) throw error;
      return data?.[0] || {
        total_students: 0,
        total_records: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0,
        attendance_rate: 0
      };
    },
    enabled: !!user?.school_id,
  });

  // Get unique grades and sections for filtering
  const grades = [...new Set(attendanceData?.map(d => d.grade) || [])].sort();
  const sections = [...new Set(attendanceData?.map(d => d.section) || [])].sort();

  // Filter data based on selected filters
  const filteredData = attendanceData?.filter(d => {
    if (gradeFilter !== 'all' && d.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && d.section !== sectionFilter) return false;
    return true;
  }) || [];

  const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

  // Helper function to generate array of dates between start and end date
  const getDatesInRange = (startDate: string, endDate: string) => {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate <= lastDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Get array of dates for the selected range
  const dateRange = getDatesInRange(startDate, endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Attendance Management
          </h1>
          <p className="text-muted-foreground">
            Manage school attendance system and view comprehensive reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Link href="/school-admin/attendance/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Attendance Settings</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure attendance modes, notifications, and school policies
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {isPeriodMode ? 'Period-wise' : 'Daily'}
                    </Badge>
                    <Badge variant="outline">
                      {attendanceSettings?.notify_parents ? 'Notifications On' : 'Notifications Off'}
                    </Badge>
                  </div>
                </div>
                <div className="text-primary">
                  <Settings className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Analytics Dashboard</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    View comprehensive attendance analytics and trends
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trends
                    </Badge>
                    <Badge variant="outline">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Reports
                    </Badge>
                  </div>
                </div>
                <div className="text-primary">
                  <BarChart3 className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Export Reports</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate and download detailed attendance reports
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      CSV
                    </Badge>
                    <Badge variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Badge>
                  </div>
                </div>
                <div className="text-primary">
                  <Download className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Attendance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <AttendanceMetrics />
      </motion.div>

      {/* Detailed Attendance Records */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detailed Attendance Records
            </CardTitle>
            <CardDescription>
              View and analyze individual student attendance patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Date Range and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">{stats.total_students}</div>
                  <div className="text-xs text-blue-600">Students</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-lg font-bold text-green-600">{stats.present_count}</div>
                  <div className="text-xs text-green-600">Present</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-lg font-bold text-red-600">{stats.absent_count}</div>
                  <div className="text-xs text-red-600">Absent</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-lg font-bold text-yellow-600">{stats.late_count}</div>
                  <div className="text-xs text-yellow-600">Late</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">{stats.excused_count}</div>
                  <div className="text-xs text-blue-600">Excused</div>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="text-lg font-bold text-primary">{stats.attendance_rate.toFixed(1)}%</div>
                  <div className="text-xs text-primary">Rate</div>
                </div>
              </div>
            )}

            {/* Student Records Table */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Student</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Grade</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Section</th>
                      <th className="border border-gray-200 px-4 py-2 text-center">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((student) => (
                      <tr key={student.student_id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="text-sm text-gray-500">{student.admission_no}</div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">{student.grade}</td>
                        <td className="border border-gray-200 px-4 py-2">{student.section}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {dateRange.map((date) => {
                              const record = student.attendance_data && student.attendance_data[date];
                              const status = (record?.status || 'no_record') as 'present' | 'absent' | 'late' | 'excused' | 'no_record';
                              
                              const statusConfig = {
                                present: { color: 'bg-green-500', text: 'Present' },
                                absent: { color: 'bg-red-500', text: 'Absent' },
                                late: { color: 'bg-yellow-500', text: 'Late' },
                                excused: { color: 'bg-blue-500', text: 'Excused' },
                                no_record: { color: 'bg-gray-200', text: 'No record' }
                              } as const;

                              const { color, text } = statusConfig[status];
                              const day = new Date(date).getDate();

                              return (
                                <div
                                  key={date}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${color} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all mr-1`}
                                  title={`${new Date(date).toLocaleDateString()}: ${text}`}
                                >
                                  <span className={`text-xs ${status === 'no_record' ? 'text-gray-600' : 'text-white'} font-bold`}>
                                    {day}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredData.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing 10 of {filteredData.length} students. Use export for complete data.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Found</h3>
                <p className="text-gray-600">
                  No attendance records found for the selected criteria.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* System Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Current System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Attendance Mode:</span>
                <Badge variant={isPeriodMode ? 'default' : 'secondary'}>
                  {isPeriodMode ? 'Period-wise' : 'Daily'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Parent Notifications:</span>
                <Badge variant={attendanceSettings?.notify_parents ? 'default' : 'secondary'}>
                  {attendanceSettings?.notify_parents ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Grace Period:</span>
                <span className="text-muted-foreground">
                  {attendanceSettings?.grace_period_minutes || 15} minutes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Auto-mark Present:</span>
                <Badge variant={attendanceSettings?.auto_mark_present ? 'default' : 'secondary'}>
                  {attendanceSettings?.auto_mark_present ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              To modify these settings, visit the Attendance Settings page. Changes will affect how teachers mark attendance and how parents receive notifications.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 