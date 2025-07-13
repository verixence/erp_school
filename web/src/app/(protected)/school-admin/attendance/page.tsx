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
    status: string;
    recorded_by: string;
    notes: string;
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
  
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
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
    queryKey: ['attendance-pivot', user?.school_id, startDate, endDate],
    queryFn: async (): Promise<AttendancePivotData[]> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .rpc('attendance_pivot', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id,
  });

  // Fetch attendance statistics
  const { data: stats } = useQuery({
    queryKey: ['attendance-stats', user?.school_id, startDate, endDate],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .rpc('get_attendance_stats', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id
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
        <div className="flex items-center gap-4">
          <Badge variant={isPeriodMode ? 'default' : 'secondary'} className="text-sm">
            {isPeriodMode ? 'Period-wise Mode' : 'Daily Mode'}
          </Badge>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  <CardTitle>Attendance Settings</CardTitle>
                </div>
                <Badge variant="secondary">Configure</Badge>
              </div>
              <CardDescription>
                Configure attendance modes, notifications, and school policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Attendance mode configuration</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Parent notification settings</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automation preferences</span>
                </div>
                
                <Link href="/school-admin/settings/attendance">
                  <Button className="w-full" size="lg">
                    Configure Settings
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  <CardTitle>Analytics Dashboard</CardTitle>
                </div>
                <Badge variant="secondary">View</Badge>
              </div>
              <CardDescription>
                View comprehensive attendance analytics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>School-wide metrics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span>Grade-wise breakdowns</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span>Historical trends</span>
                </div>
                
                <Link href="/school-admin">
                  <Button variant="outline" className="w-full" size="lg">
                    View Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-amber-200 hover:border-amber-400 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-6 w-6 text-amber-600" />
                  <CardTitle>Export Reports</CardTitle>
                </div>
                <Badge variant="secondary">Export</Badge>
              </div>
              <CardDescription>
                Generate and download detailed attendance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span>Date range selection</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4 text-amber-500" />
                  <span>Grade/section filtering</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Download className="h-4 w-4 text-amber-500" />
                  <span>Multiple format support</span>
                </div>
                
                <Button variant="outline" className="w-full" size="lg" disabled>
                  Generate Report
                  <Download className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Metrics Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <AttendanceMetrics />
      </motion.div>

      {/* Detailed Reports Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Detailed Attendance Records
                </CardTitle>
                <CardDescription>
                  View and analyze individual student attendance patterns
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
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
                    {filteredData.slice(0, 10).map((student) => (
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
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {Object.entries(student.attendance_data).slice(0, 7).map(([date, record]) => (
                              <div
                                key={date}
                                className={`w-3 h-3 rounded-full ${
                                  record.status === 'present' ? 'bg-green-500' :
                                  record.status === 'absent' ? 'bg-red-500' :
                                  record.status === 'late' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`}
                                title={`${date}: ${record.status}`}
                              />
                            ))}
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