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

  // Get current weekday (1 = Monday, 7 = Sunday) - Fixed for correct database mapping
  const getCurrentWeekday = () => {
    // HTML date input always provides dates in YYYY-MM-DD format
    const date = new Date(selectedDate + 'T00:00:00'); // Add time to avoid timezone issues
    
    // Validate that the date was parsed correctly
    if (isNaN(date.getTime())) {
      console.error('Invalid date format:', selectedDate);
      return 1; // Default to Monday
    }
    
    const day = date.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
    
    // Database uses: 1=Monday, 2=Tuesday, ..., 7=Sunday
    // JavaScript uses: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert JavaScript weekday to database weekday
    const weekday = day === 0 ? 7 : day;
    
    return weekday;
  };

  // Validate if teacher can mark attendance for selected date
  const canMarkAttendanceForDate = () => {
    const selectedDateObj = new Date(selectedDate);
    const today = new Date();
    
    // Can't mark attendance for future dates
    if (selectedDateObj > today) {
      return { valid: false, reason: 'Cannot mark attendance for future dates' };
    }
    
    // Can't mark attendance for dates too far in the past (configurable)
    const maxPastDays = 7; // Allow marking attendance up to 7 days ago
    const pastLimit = new Date();
    pastLimit.setDate(pastLimit.getDate() - maxPastDays);
    
    if (selectedDateObj < pastLimit) {
      return { valid: false, reason: `Cannot mark attendance for dates older than ${maxPastDays} days` };
    }
    
    return { valid: true, reason: null };
  };

  // Fetch teacher's periods for the selected date
  const { data: teacherPeriods, error: periodsError, isLoading: periodsLoading } = useQuery({
    queryKey: ['teacher-periods', user?.id, selectedDate],
    queryFn: async (): Promise<Period[]> => {
      if (!user?.id) return [];

      const weekday = getCurrentWeekday();
      
      // Additional validation: Check if we have a valid weekday
      if (weekday < 1 || weekday > 7) {
        throw new Error('Invalid date selected');
      }
      
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
      
      // Map the data to extract grade and section from the nested sections object
      const mappedData = (data || []).map((period: any) => ({
        ...period,
        grade: period.sections?.grade || 'Unknown',
        section: period.sections?.section || 'Unknown'
      }));
      
      return mappedData;
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

      // Use section_id to join with students table properly
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .eq('school_id', user?.school_id)
        .eq('section_id', period.section_id)
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
    if (students && students.length > 0) {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      
      // Initialize all students as present by default
      students.forEach(student => {
        attendanceMap[student.id] = {
          student_id: student.id,
          status: 'present',
          notes: ''
        };
      });

      // Override with existing records if they exist
      if (existingAttendance && existingAttendance.length > 0) {
        existingAttendance.forEach(record => {
          attendanceMap[record.student_id] = {
            student_id: record.student_id,
            status: record.status as any,
            notes: record.notes || ''
          };
        });
      }

      setAttendanceData(attendanceMap);
    }
  }, [existingAttendance, students]);

  // Reset selected period when date changes
  useEffect(() => {
    setSelectedPeriod('');
  }, [selectedDate]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      // Validate before saving
      const validation = canMarkAttendance();
      if (!validation.valid) {
        throw new Error(validation.reason || 'Cannot mark attendance at this time');
      }

      if (!user?.school_id || !user?.id) {
        throw new Error('User session expired. Please log in again.');
      }

      const period = teacherPeriods?.find(p => p.id === selectedPeriod);
      if (!period) {
        throw new Error('Selected period is not valid for this date');
      }

      // Double-check weekday validation
      const weekday = getCurrentWeekday();
      if (period.weekday !== weekday) {
        throw new Error('Period does not match selected date');
      }

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

      // Handle period attendance with manual insert/update since we can't use upsert with partial constraints
      for (const record of records) {
        // First try to find existing record
        const { data: existingRecords, error: selectError } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('student_id', record.student_id)
          .eq('date', record.date)
          .eq('period_number', record.period_number)
          .eq('subject', record.subject);

        if (selectError) {
          throw selectError;
        }

        const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

        if (existingRecord) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('attendance_records')
            .update({
              status: record.status,
              recorded_by: record.recorded_by,
              notes: record.notes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id);

          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('attendance_records')
            .insert({
              ...record,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Period attendance saved successfully');
      queryClient.invalidateQueries({ queryKey: ['period-attendance'] });
      // Reset selection after successful save
      setSelectedPeriod('');
    },
    onError: (error) => {
      console.error('Save attendance error:', error);
      toast.error(error.message || 'Failed to save attendance');
    },
  });

  // Validation functions
  const canMarkAttendance = () => {
    const dateValidation = canMarkAttendanceForDate();
    if (!dateValidation.valid) {
      return { valid: false, reason: dateValidation.reason };
    }
    
    // Check if teacher has any periods on this date
    if (!teacherPeriods || teacherPeriods.length === 0) {
      return { valid: false, reason: 'You have no periods assigned for this date' };
    }
    
    // Check if a period is selected
    if (!selectedPeriod) {
      return { valid: false, reason: 'Please select a period' };
    }
    
    // Validate that the selected period belongs to the teacher on this date
    const period = teacherPeriods.find(p => p.id === selectedPeriod);
    if (!period) {
      return { valid: false, reason: 'Selected period is not assigned to you on this date' };
    }
    
    return { valid: true, reason: null };
  };

  const getValidationMessage = () => {
    const validation = canMarkAttendance();
    if (!validation.valid) {
      return validation.reason;
    }
    
    if (periodsError) {
      return 'Error loading your periods. Please try again.';
    }
    
    return null;
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
              <Select 
                value={selectedPeriod} 
                onValueChange={setSelectedPeriod}
                disabled={periodsLoading || !teacherPeriods || teacherPeriods.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    periodsLoading ? "Loading periods..." : 
                    !teacherPeriods || teacherPeriods.length === 0 ? "No periods available" :
                    "Select a period"
                  } />
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
              
              {periodsError && (
                <div className="text-sm text-red-600 mt-1">
                  Error loading periods: {periodsError.message}
                </div>
              )}
            </div>
          </div>

          {!canMarkAttendance().valid && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{getValidationMessage()}</span>
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
                          disabled={!canMarkAttendance().valid}
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

            {canMarkAttendance().valid && (
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
      {!periodsLoading && teacherPeriods && teacherPeriods.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Periods Assigned</h3>
            <p className="text-muted-foreground mb-2">
              You don't have any periods assigned for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}.
            </p>
            <p className="text-sm text-muted-foreground">
              Please select a different date or contact your administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {periodsLoading && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your periods...</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {periodsError && (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Periods</h3>
            <p className="text-muted-foreground mb-4">
              Unable to load your periods for this date. Please try again.
            </p>
            <p className="text-sm text-red-600 mb-4">
              {periodsError.message}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              Refresh Page
            </Button>
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