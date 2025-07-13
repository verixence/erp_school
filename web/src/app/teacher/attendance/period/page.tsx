'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Users, 
  Calendar,
  Check,
  X,
  AlertTriangle,
  FileX,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface Period {
  id: string;
  section_id: string;
  period_no: number;
  subject: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  grade: string;
  section: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  grace_period_minutes: number;
}

export default function TeacherPeriodAttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});

  // Check if school uses period attendance
  const { data: attendanceSettings } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .from('attendance_settings')
        .select('attendance_mode, notify_parents, grace_period_minutes')
        .eq('school_id', user.school_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Get current weekday (1 = Monday, 7 = Sunday)
  const getCurrentWeekday = () => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
  };

  // Fetch teacher's periods for the selected date
  const { data: teacherPeriods } = useQuery({
    queryKey: ['teacher-periods', user?.id, selectedDate],
    queryFn: async (): Promise<Period[]> => {
      if (!user?.id) return [];

      const weekday = getCurrentWeekday();
      
      const { data, error } = await supabase
        .from('periods')
        .select(`
          id,
          section_id,
          period_no,
          subject,
          teacher_id,
          weekday,
          start_time,
          end_time,
          sections!inner(grade, section)
        `)
        .eq('teacher_id', user.id)
        .eq('weekday', weekday)
        .order('period_no');

      if (error) throw error;

             return (data || []).map((period: any) => ({
         ...period,
         grade: period.sections.grade,
         section: period.sections.section
       }));
    },
    enabled: !!user?.id && !!selectedDate,
  });

  // Fetch students for selected period
  const { data: students } = useQuery({
    queryKey: ['period-students', selectedPeriod],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedPeriod) return [];

      const period = teacherPeriods?.find(p => p.id === selectedPeriod);
      if (!period) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .eq('school_id', user?.school_id)
        .eq('grade', period.grade)
        .eq('section', period.section)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPeriod && !!teacherPeriods?.length,
  });

  // Fetch existing attendance for selected period
  const { data: existingAttendance } = useQuery({
    queryKey: ['period-attendance', selectedPeriod, selectedDate],
    queryFn: async () => {
      if (!selectedPeriod || !selectedDate || !students?.length) return [];

      const period = teacherPeriods?.find(p => p.id === selectedPeriod);
      if (!period) return [];

      const studentIds = students.map(s => s.id);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, status, notes')
        .eq('school_id', user?.school_id)
        .eq('date', selectedDate)
        .eq('period_number', period.period_no)
        .eq('subject', period.subject)
        .in('student_id', studentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPeriod && !!selectedDate && !!students?.length && !!teacherPeriods?.length,
  });

  // Initialize attendance data when existing records are loaded
  useEffect(() => {
    if (existingAttendance && students) {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      
      // Initialize all students as present by default
      students.forEach(student => {
        attendanceMap[student.id] = {
          student_id: student.id,
          status: 'present',
          notes: ''
        };
      });

      // Override with existing records
      existingAttendance.forEach(record => {
        attendanceMap[record.student_id] = {
          student_id: record.student_id,
          status: record.status as any,
          notes: record.notes || ''
        };
      });

      setAttendanceData(attendanceMap);
    }
  }, [existingAttendance, students]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPeriod || !selectedDate || !user?.school_id) {
        throw new Error('Missing required data');
      }

      const period = teacherPeriods?.find(p => p.id === selectedPeriod);
      if (!period) throw new Error('Period not found');

      const records = Object.values(attendanceData).map(record => ({
        school_id: user.school_id,
        student_id: record.student_id,
        date: selectedDate,
        status: record.status,
        recorded_by: user.id,
        notes: record.notes || null,
        period_id: period.id,
        period_number: period.period_no,
        subject: period.subject
      }));

      // Handle upsert manually for partial unique index
      // First, delete existing records for this period to avoid conflicts
      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('date', selectedDate)
        .eq('period_number', period.period_no)
        .eq('subject', period.subject)
        .in('student_id', records.map(r => r.student_id));

      if (deleteError) throw deleteError;

      // Then insert new records
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(records);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Period attendance saved successfully');
      queryClient.invalidateQueries({ queryKey: ['period-attendance'] });
    },
    onError: (error) => {
      toast.error('Failed to save attendance: ' + error.message);
    },
  });

  // Validation functions
  const canMarkAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate <= today;
  };

  const isCurrentPeriod = (period: Period) => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    // Check if start_time and end_time exist and are valid
    if (!period.start_time || !period.end_time) {
      return false;
    }
    
    const periodStart = parseInt(period.start_time.replace(':', ''));
    const periodEnd = parseInt(period.end_time.replace(':', ''));
    
    return currentTime >= periodStart && currentTime <= periodEnd;
  };

  const updateAttendance = (studentId: string, status: AttendanceRecord['status'], notes?: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        status,
        notes: notes || prev[studentId]?.notes || ''
      }
    }));
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <Check className="w-4 h-4" />;
      case 'absent': return <X className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      case 'excused': return <FileX className="w-4 h-4" />;
      default: return null;
    }
  };

  // Check if school doesn't use period attendance
  if (attendanceSettings?.attendance_mode !== 'per_period') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Period Attendance Not Enabled</h3>
            <p className="text-muted-foreground mb-4">
              Your school is configured for daily attendance mode. Period-wise attendance is not available.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your school administrator to enable period-wise attendance tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Period Attendance
          </h1>
          <p className="text-muted-foreground">
            Mark attendance for your assigned periods
          </p>
        </div>
      </div>

      {/* Date and Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date & Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a period" />
                </SelectTrigger>
                <SelectContent>
                  {teacherPeriods?.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <div>
                          <div className="font-medium">
                            Period {period.period_no} - {period.subject}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Grade {period.grade}-{period.section} • {period.start_time} - {period.end_time}
                            {isCurrentPeriod(period) && (
                              <Badge className="ml-2" variant="default">Current</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!canMarkAttendance() && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Cannot mark attendance for future dates</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students List */}
      {selectedPeriod && students && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length})
            </CardTitle>
            <CardDescription>
              Mark attendance for each student in this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.map((student) => {
                const attendance = attendanceData[student.id];
                const status = attendance?.status || 'present';

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.admission_no} • Grade {student.grade}-{student.section}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {['present', 'absent', 'late', 'excused'].map((statusOption) => (
                        <Button
                          key={statusOption}
                          variant={status === statusOption ? 'default' : 'outline'}
                          size="sm"
                          className={status === statusOption ? getStatusColor(statusOption) : ''}
                          onClick={() => updateAttendance(student.id, statusOption as any)}
                          disabled={!canMarkAttendance()}
                        >
                          {getStatusIcon(statusOption)}
                          <span className="ml-1 capitalize">{statusOption}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {canMarkAttendance() && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => saveAttendanceMutation.mutate()}
                  disabled={saveAttendanceMutation.isPending}
                  className="px-6"
                >
                  {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No periods message */}
      {teacherPeriods && teacherPeriods.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Periods Assigned</h3>
            <p className="text-muted-foreground">
              You don't have any periods assigned for {new Date(selectedDate).toLocaleDateString()}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No students message */}
      {selectedPeriod && students && students.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
            <p className="text-muted-foreground">
              No students found for the selected period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 