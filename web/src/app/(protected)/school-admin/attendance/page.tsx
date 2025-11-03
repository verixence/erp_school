'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Calendar, 
  Users, 
  Download, 
  Filter,
  TrendingUp,
  Clock,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ClockIcon,
  FileText
} from 'lucide-react';
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
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  attendance_data: Record<string, any>;
}

interface AttendanceStats {
  total_students: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
  daily_averages: Array<{
    date: string;
    total: number;
    present: number;
    rate: number;
  }>;
  by_grade: Array<{
    grade: string;
    total: number;
    present: number;
    rate: number;
  }>;
}

export default function SchoolAdminAttendanceHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Set default dates to show recent data
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Fetch attendance settings
  const { data: attendanceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .eq('school_id', user.school_id)
        .single();

      if (error) {
        // Return default settings if no settings found
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

  // Fetch attendance pivot data using the fixed function
  const { data: attendanceData, isLoading: attendanceLoading, refetch } = useQuery({
    queryKey: ['attendance-pivot', user?.school_id, startDate, endDate],
    queryFn: async (): Promise<AttendancePivotData[]> => {
      if (!user?.school_id) throw new Error('No school ID');

      // Auto-detect attendance mode from settings
      const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

      const { data, error } = await supabase
        .rpc('attendance_pivot', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id,
          is_period_mode: isPeriodMode
        });

      if (error) throw error;
      
      // Normalize date keys to YYYY-MM-DD format for frontend consistency
      const normalizedData = (data || []).map((student: AttendancePivotData) => ({
        ...student,
        attendance_data: Object.keys(student.attendance_data).reduce((acc, key) => {
          // Convert "2025-07-15 00:00:00+00" to "2025-07-15"
          const normalizedKey = key.split(' ')[0];
          acc[normalizedKey] = student.attendance_data[key];
          return acc;
        }, {} as Record<string, any>)
      }));
      
      return normalizedData;
    },
    enabled: !!user?.school_id && !!attendanceSettings,
  });

  // Fetch attendance statistics using the fixed function
  const { data: attendanceStats, isLoading: statsLoading } = useQuery({
    queryKey: ['attendance-stats', user?.school_id, startDate, endDate, gradeFilter, sectionFilter],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!user?.school_id) throw new Error('No school ID');

      // Auto-detect attendance mode from settings
      const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

      const { data, error } = await supabase
        .rpc('get_enhanced_attendance_stats', {
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
        attendance_rate: 0,
        daily_averages: [],
        by_grade: []
      };
    },
    enabled: !!user?.school_id && !!attendanceSettings,
  });

  // Update attendance mode
  const updateAttendanceMode = useMutation({
    mutationFn: async (mode: 'daily' | 'per_period') => {
      if (!user?.school_id) throw new Error('No school ID');
      
      const { error } = await supabase
        .from('attendance_settings')
        .upsert({
          school_id: user.school_id,
          attendance_mode: mode,
          notify_parents: attendanceSettings?.notify_parents ?? true,
          grace_period_minutes: attendanceSettings?.grace_period_minutes ?? 15,
          auto_mark_present: attendanceSettings?.auto_mark_present ?? false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attendance mode updated successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-pivot'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (error) => {
      toast.error('Failed to update attendance mode: ' + error.message);
    },
  });

  // Export attendance data
  const exportAttendance = async () => {
    if (!attendanceData) return;

    const csvData = attendanceData.map(student => {
      const row: any = {
        'Student Name': student.student_name,
        'Admission No': student.admission_no,
        'Grade': student.grade,
        'Section': student.section,
      };

      // Add date columns
      Object.keys(student.attendance_data).forEach(date => {
        const dateData = student.attendance_data[date];
        if (typeof dateData === 'object' && dateData.status) {
          row[format(new Date(date + 'T00:00:00'), 'MMM dd, yyyy')] = dateData.status;
        }
      });

      return row;
    });

    // Convert to CSV
    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter attendance data
  const filteredAttendanceData = attendanceData?.filter(student => {
    if (gradeFilter !== 'all' && student.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && student.section !== sectionFilter) return false;
    return true;
  });

  // Get unique grades and sections for filters
  const grades = [...new Set(attendanceData?.map(s => s.grade) || [])].sort();
  const sections = [...new Set(attendanceData?.map(s => s.section) || [])].sort();

  // Get date range for column headers
  const dateRange: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dateRange.push(d.toISOString().split('T')[0]);
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late': return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'excused': return <FileText className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Attendance Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage student attendance across your school
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={attendanceSettings?.attendance_mode === 'per_period' ? 'default' : 'secondary'}>
            {attendanceSettings?.attendance_mode === 'per_period' ? 'Period-wise Mode' : 'Daily Mode'}
          </Badge>
          <Button
            onClick={() => updateAttendanceMode.mutate(
              attendanceSettings?.attendance_mode === 'per_period' ? 'daily' : 'per_period'
            )}
            disabled={updateAttendanceMode.isPending}
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Switch Mode
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats?.total_students || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in selected filter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendanceStats?.attendance_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {attendanceStats?.present_count || 0} of {attendanceStats?.total_records || 0} present
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendanceStats?.present_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Students marked present
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {attendanceStats?.absent_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Students marked absent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
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
              <Label htmlFor="section">Section</Label>
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
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportAttendance} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            Showing attendance data from {format(new Date(startDate), 'MMM dd, yyyy')} to {format(new Date(endDate), 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium">Student</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium">Grade</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium">Section</th>
                    {dateRange.map(dateStr => (
                      <th key={dateStr} className="border border-gray-200 px-4 py-3 text-center font-medium min-w-[100px]">
                        {format(new Date(dateStr + 'T00:00:00'), 'MMM dd')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendanceData?.map((student, index) => (
                    <motion.tr
                      key={student.student_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="border border-gray-200 px-4 py-3">
                        <div>
                          <div className="font-medium">{student.student_name}</div>
                          <div className="text-sm text-gray-500">{student.admission_no}</div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3">{student.grade}</td>
                      <td className="border border-gray-200 px-4 py-3">{student.section}</td>
                      {dateRange.map(dateStr => {
                        const attendanceRecord = student.attendance_data[dateStr];
                        const status = attendanceRecord?.status || 'no_record';
                        const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';
                        const periods = attendanceRecord?.periods || {};
                        
                        return (
                          <td key={dateStr} className="border border-gray-200 px-4 py-3 text-center">
                            {status !== 'no_record' ? (
                              <div className="space-y-1">
                                {/* Overall Status */}
                                <Badge 
                                  variant="secondary" 
                                  className={`${getStatusColor(status)} flex items-center gap-1 justify-center`}
                                >
                                  {getStatusIcon(status)}
                                  <span className="capitalize">{status.replace('_', ' ')}</span>
                                </Badge>
                                
                                {/* Period Details for Period Mode */}
                                {isPeriodMode && Object.keys(periods).length > 0 && (
                                  <div className="text-xs space-y-1 mt-1">
                                    {Object.entries(periods).map(([periodNum, periodData]: [string, any]) => (
                                      <div key={periodNum} className="flex items-center justify-center gap-1">
                                        <span className="text-gray-600">P{periodNum}:</span>
                                        <Badge 
                                          variant="outline" 
                                          className={`${getStatusColor(periodData.status)} text-xs py-0 px-1`}
                                        >
                                          {periodData.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Subject info for period mode */}
                                {isPeriodMode && attendanceRecord?.periods && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {Object.values(attendanceRecord.periods).map((p: any) => p.subject).join(', ')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No Record</span>
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Averages Chart */}
      {attendanceStats?.daily_averages && attendanceStats.daily_averages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceStats.daily_averages.map((day, index) => (
                day.date && (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{format(new Date(day.date), 'MMM dd, yyyy')}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{day.present}/{day.total}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {day.rate}%
                      </Badge>
                    </div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 