'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Calendar, 
  Users, 
  Clock,
  ArrowRight,
  Settings,
  CheckCircle,
  BookOpen,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  grace_period_minutes: number;
  auto_mark_present: boolean;
}

interface AttendanceStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  attendance_rate: number;
}

export default function TeacherAttendanceHub() {
  const { user } = useAuth();

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

  // Fetch today's attendance stats
  const { data: stats } = useQuery({
    queryKey: ['teacher-attendance-stats', user?.id],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!user?.id) throw new Error('No user ID');

      const today = new Date().toISOString().split('T')[0];
      
      // Get sections where this teacher is assigned
      const { data: sectionData, error: sectionError } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (sectionError) throw sectionError;

      const sectionIds = sectionData?.map((item: any) => item.sections.id) || [];

      if (sectionIds.length === 0) {
        return {
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          attendance_rate: 0,
        };
      }

      // Get students in these sections
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .in('section_id', sectionIds);

      if (studentsError) throw studentsError;

      const studentIds = students?.map(s => s.id) || [];
      const totalStudents = studentIds.length;

      if (totalStudents === 0) {
        return {
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          attendance_rate: 0,
        };
      }

      // Get today's attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      const presentToday = attendance?.filter(a => a.status === 'present').length || 0;
      const absentToday = attendance?.filter(a => a.status === 'absent').length || 0;
      const attendanceRate = totalStudents > 0 ? (presentToday / totalStudents) * 100 : 0;

      return {
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: absentToday,
        attendance_rate: Math.round(attendanceRate),
      };
    },
    enabled: !!user?.id,
  });

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-8 w-8" />
            Attendance Management
          </h1>
          <p className="text-muted-foreground">
            Mark and manage student attendance for your classes
          </p>
        </div>
        <Badge variant={isPeriodMode ? 'default' : 'secondary'} className="text-sm">
          {isPeriodMode ? 'Period-wise Mode' : 'Daily Mode'}
        </Badge>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{stats.total_students}</p>
                  </div>
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                    <p className="text-2xl font-bold text-green-600">{stats.present_today}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Absent Today</p>
                    <p className="text-2xl font-bold text-red-600">{stats.absent_today}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.attendance_rate}%</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Attendance Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Attendance Method */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPeriodMode ? (
                    <Clock className="h-6 w-6 text-primary" />
                  ) : (
                    <Calendar className="h-6 w-6 text-primary" />
                  )}
                  <CardTitle>
                    {isPeriodMode ? 'Period-wise Attendance' : 'Daily Attendance'}
                  </CardTitle>
                </div>
                <Badge variant="default">Recommended</Badge>
              </div>
              <CardDescription>
                {isPeriodMode 
                  ? 'Mark attendance for individual periods and subjects'
                  : 'Mark daily attendance for your assigned sections'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {isPeriodMode 
                      ? 'Subject-specific tracking'
                      : 'Quick class-wide marking'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {isPeriodMode 
                      ? 'Integrated with timetable'
                      : 'Simple daily workflow'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automatic parent notifications</span>
                </div>
                
                <Link href={isPeriodMode ? '/teacher/attendance/period' : '/teacher/attendance/daily'}>
                  <Button className="w-full" size="lg">
                    {isPeriodMode ? 'Mark Period Attendance' : 'Mark Daily Attendance'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alternative Method */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {isPeriodMode ? (
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Clock className="h-6 w-6 text-muted-foreground" />
                )}
                <CardTitle className="text-muted-foreground">
                  {isPeriodMode ? 'Daily Attendance (Legacy)' : 'Period Attendance (Ask Admin)'}
                </CardTitle>
              </div>
              <CardDescription>
                {isPeriodMode 
                  ? 'Use the old daily attendance method if needed'
                  : 'Period-wise attendance requires school admin to enable it'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isPeriodMode ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>Limited tracking capabilities</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>Not recommended for regular use</span>
                    </div>
                    
                    <Link href="/teacher/attendance/daily">
                      <Button variant="outline" className="w-full" size="lg">
                        Use Daily Attendance
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Settings className="h-4 w-4 text-blue-500" />
                      <span>Requires admin configuration</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <span>Advanced tracking features</span>
                    </div>
                    
                    <Button variant="outline" className="w-full" size="lg" disabled>
                      Contact School Admin
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* School Settings Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              School Attendance Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Mode:</span>
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
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Contact your school administrator to modify these settings or switch attendance modes.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 