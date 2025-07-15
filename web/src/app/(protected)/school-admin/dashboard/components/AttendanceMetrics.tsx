'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface AttendanceMetrics {
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

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
}

export default function AttendanceMetrics() {
  const { user } = useAuth();

  // Date range for current week
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6); // Last 7 days
  const endDate = new Date();

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

  // Fetch enhanced attendance statistics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['enhanced-attendance-stats', user?.school_id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<AttendanceMetrics> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .rpc('get_enhanced_attendance_stats', {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
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
        attendance_rate: 0,
        daily_averages: [],
        by_grade: []
      };
    },
    enabled: !!user?.school_id,
  });

  // Calculate trends
  const getTrendDirection = () => {
    if (!metrics?.daily_averages || metrics.daily_averages.length < 2) return null;
    
    const recent = metrics.daily_averages.slice(-3);
    const earlier = metrics.daily_averages.slice(-6, -3);
    
    if (recent.length === 0 || earlier.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, day) => sum + day.rate, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, day) => sum + day.rate, 0) / earlier.length;
    
    return recentAvg > earlierAvg ? 'up' : 'down';
  };

  const trendDirection = getTrendDirection();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Overview</h2>
          <p className="text-muted-foreground">
            Last 7 days • {settings?.attendance_mode === 'per_period' ? 'Period-wise' : 'Daily'} tracking
          </p>
        </div>
        <Badge variant={settings?.attendance_mode === 'per_period' ? 'default' : 'secondary'}>
          {settings?.attendance_mode === 'per_period' ? 'Per-Period Mode' : 'Daily Mode'}
        </Badge>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overall Attendance Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overall Attendance</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {(metrics?.attendance_rate || 0).toFixed(1)}%
                  </p>
                  {trendDirection && (
                    <div className={`flex items-center ${trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {trendDirection === 'up' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${metrics?.attendance_rate || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Students */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.total_students}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Present Today */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.present_count}</p>
                <p className="text-xs text-muted-foreground">
                  {(metrics?.total_records || 0) > 0 ? 
                    (((metrics?.present_count || 0) / (metrics?.total_records || 1)) * 100).toFixed(1) : 0}% of records
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Absent/Late */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent/Late</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(metrics?.absent_count || 0) + (metrics?.late_count || 0)}
                </p>
                <div className="text-xs text-muted-foreground space-x-2">
                  <span>{metrics?.absent_count} absent</span>
                  <span>•</span>
                  <span>{metrics?.late_count} late</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends */}
      {metrics?.daily_averages && metrics.daily_averages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Attendance Trends
            </CardTitle>
            <CardDescription>
              Attendance rates over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.daily_averages.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.present}/{day.total} present
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${day.rate}%` }}
                        ></div>
                      </div>
                    </div>
                    <Badge variant={day.rate >= 90 ? 'default' : day.rate >= 75 ? 'secondary' : 'destructive'}>
                      {(day.rate || 0).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade-wise Breakdown */}
      {metrics?.by_grade && metrics.by_grade.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Grade-wise Attendance
            </CardTitle>
            <CardDescription>
              Attendance breakdown by grade level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.by_grade.map((grade) => (
                <div key={grade.grade} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Grade {grade.grade}</h4>
                    <Badge variant={grade.rate >= 90 ? 'default' : grade.rate >= 75 ? 'secondary' : 'destructive'}>
                      {(grade.rate || 0).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${grade.rate}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {grade.present}/{grade.total} students present
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Status */}
      {settings?.notify_parents && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Parent notifications are enabled for absent, late, and excused students
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 