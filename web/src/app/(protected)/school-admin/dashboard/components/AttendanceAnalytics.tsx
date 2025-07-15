'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Calendar,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

interface PeriodAttendanceData {
  period_number: number;
  subject: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
}

interface AttendanceAnalytics {
  total_students: number;
  overall_attendance_rate: number;
  period_breakdown: PeriodAttendanceData[];
  daily_summary: {
    date: string;
    present: number;
    absent: number;
    late: number;
    total: number;
  };
}

export default function AttendanceAnalytics() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's attendance analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['attendance-analytics', user?.school_id, today],
    queryFn: async (): Promise<AttendanceAnalytics> => {
      if (!user?.school_id) throw new Error('No school ID');

      // Get period-wise breakdown for today
      const { data: periodData, error: periodError } = await supabase
        .from('attendance_records')
        .select(`
          period_number,
          subject,
          status,
          student_id,
          students!inner(id, full_name, grade, section)
        `)
        .eq('school_id', user.school_id)
        .eq('date', today)
        .not('period_number', 'is', null);

      if (periodError) throw periodError;

      // Get total students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id);

      if (studentsError) throw studentsError;

      // Process period breakdown
      const periodBreakdown: { [key: string]: PeriodAttendanceData } = {};
      
      periodData?.forEach(record => {
        const key = `${record.period_number}-${record.subject}`;
        if (!periodBreakdown[key]) {
          periodBreakdown[key] = {
            period_number: record.period_number,
            subject: record.subject,
            total_students: 0,
            present_count: 0,
            absent_count: 0,
            late_count: 0,
            attendance_rate: 0
          };
        }
        
        periodBreakdown[key].total_students++;
        if (record.status === 'present') periodBreakdown[key].present_count++;
        else if (record.status === 'absent') periodBreakdown[key].absent_count++;
        else if (record.status === 'late') periodBreakdown[key].late_count++;
      });

      // Calculate attendance rates
      Object.values(periodBreakdown).forEach(period => {
        if (period.total_students > 0) {
          period.attendance_rate = Math.round((period.present_count / period.total_students) * 100);
        }
      });

      // Calculate overall stats
      const totalRecords = periodData?.length || 0;
      const presentCount = periodData?.filter(r => r.status === 'present').length || 0;
      const absentCount = periodData?.filter(r => r.status === 'absent').length || 0;
      const lateCount = periodData?.filter(r => r.status === 'late').length || 0;

      return {
        total_students: studentsData?.length || 0,
        overall_attendance_rate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
        period_breakdown: Object.values(periodBreakdown).sort((a, b) => a.period_number - b.period_number),
        daily_summary: {
          date: today,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          total: totalRecords
        }
      };
    },
    enabled: !!user?.school_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 text-green-800';
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Today's Attendance Analytics</h2>
        <Badge variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date(today).toLocaleDateString()}
        </Badge>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_students || 0}</div>
            <p className="text-xs text-muted-foreground">Enrolled in school</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.overall_attendance_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all periods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.daily_summary.present || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {analytics?.daily_summary.total || 0} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics?.daily_summary.absent || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.daily_summary.late || 0} late arrivals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Period-wise Attendance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.period_breakdown && analytics.period_breakdown.length > 0 ? (
            <div className="space-y-4">
              {analytics.period_breakdown.map((period, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Period {period.period_number}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {period.subject}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {period.present_count}/{period.total_students} students
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(period.attendance_rate)}
                    >
                      {period.attendance_rate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No attendance records for today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 