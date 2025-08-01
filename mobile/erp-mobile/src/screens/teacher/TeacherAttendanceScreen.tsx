import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
  Dimensions,
  Modal,
  TextInput 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  BookOpen,
  GraduationCap,
  Filter,
  Download,
  ArrowRight,
  UserCheck,
  Settings,
  AlertTriangle,
  BarChart3,
  Activity,
  Target,
  ChevronDown,
  FileX
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Section {
  id: string;
  grade: number;
  section: string;
  class_teacher?: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  section_id: string;
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
  id?: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period_number?: number;
  period_id?: string;
  subject?: string;
  recorded_by: string;
  notes?: string;
  section_id?: string;
}

interface AttendanceSettings {
  attendance_mode: 'daily' | 'per_period';
  notify_parents: boolean;
  grace_period_minutes: number;
  auto_mark_present: boolean;
}

export const TeacherAttendanceScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    console.log('Initial selectedDate set to:', today);
    console.log('Current date object:', new Date().toString());
    console.log('ISO string:', new Date().toISOString());
    console.log('Local date string:', new Date().toDateString());
    return today;
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

  // Fetch attendance settings to determine mode
  const { data: attendanceSettings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) {
        throw new Error('No school ID');
      }

      // First try to get from attendance_settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('attendance_settings')
        .select('*')
        .eq('school_id', user.school_id)
        .single();

      if (!settingsError && settingsData) {
        return settingsData;
      }

      // Fall back to schools table
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('attendance_mode')
        .eq('id', user.school_id)
        .single();

      if (schoolError) {
        // If no settings found, return defaults
        return {
          attendance_mode: 'daily' as const,
          notify_parents: true,
          grace_period_minutes: 15,
          auto_mark_present: false
        };
      }
      return {
        attendance_mode: schoolData.attendance_mode || 'daily' as const,
        notify_parents: true,
        grace_period_minutes: 15,
        auto_mark_present: false
      };
    },
    enabled: !!user?.school_id,
    retry: 3,
    retryDelay: 1000,
  });

  const isPeriodMode = attendanceSettings?.attendance_mode === 'per_period';

  // Fetch teacher's assigned sections
  const { data: sections = [], isLoading: sectionsLoading, refetch: refetchSections } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id,
            class_teacher
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        class_teacher: item.sections.class_teacher
      }));
    },
    enabled: !!user?.id,
  });


  // Memoize weekday calculation to prevent infinite re-renders
  const currentWeekday = useMemo(() => {
    // Parse the date safely to avoid timezone issues
    const date = new Date(selectedDate + 'T12:00:00');
    const day = date.getDay();
    
    console.log('=== WEEKDAY DEBUG ===');
    console.log('Selected date:', selectedDate);
    console.log('Parsed date:', date.toString());
    console.log('getDay() result:', day);
    console.log('Day name:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]);
    
    // Convert JavaScript weekday to database weekday
    const result = day === 0 ? 0 : day;
    console.log('Calculated weekday for DB query:', result);
    console.log('===================');
    
    return result;
  }, [selectedDate]);

  // Fetch teacher's periods for selected date (period mode only)
  const { data: teacherPeriods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['teacher-periods', user?.id, selectedDate, isPeriodMode, currentWeekday],
    queryFn: async (): Promise<Period[]> => {
      if (!user?.id || !isPeriodMode) return [];

      // If Sunday (weekday 0), return empty array as there are no periods
      if (currentWeekday === 0) {
        return [];
      }

      console.log('Querying periods with teacher_id:', user.id, 'and weekday:', currentWeekday, 'for date:', selectedDate);
      
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
        .eq('weekday', currentWeekday)
        .order('period_no');
      
      console.log('Query result for weekday', currentWeekday, ':', data?.length || 0, 'periods found');
      console.log('Periods:', data);

      if (error) throw error;
      
      return (data || []).map((period: any) => ({
        ...period,
        grade: period.sections?.grade || 'Unknown',
        section: period.sections?.section || 'Unknown'
      }));
    },
    enabled: !!user?.id && !!selectedDate && isPeriodMode,
  });

  // Fetch students for selected section/period
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', selectedSection, selectedPeriod, isPeriodMode],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedSection && !selectedPeriod) return [];

      let sectionId = selectedSection;

      // For period mode, get section from selected period
      if (isPeriodMode && selectedPeriod) {
        const period = teacherPeriods.find(p => p.id === selectedPeriod);
        if (!period) return [];
        sectionId = period.section_id;
      }

      if (!sectionId) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, section_id')
        .eq('section_id', sectionId)
        .eq('school_id', user?.school_id)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id && (!!selectedSection || (isPeriodMode && !!selectedPeriod)),
  });

  // Fetch existing attendance
  const { data: existingAttendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', selectedSection, selectedPeriod, selectedDate, isPeriodMode],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!selectedDate || students.length === 0) return [];

      const studentIds = students.map(s => s.id);
      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('date', selectedDate)
        .eq('school_id', user?.school_id)
        .in('student_id', studentIds);

      if (isPeriodMode && selectedPeriod) {
        // For period mode, filter by period details
        const period = teacherPeriods.find(p => p.id === selectedPeriod);
        if (period) {
          query = query
            .eq('period_number', period.period_no)
            .eq('subject', period.subject);
        }
      } else {
        // For daily mode, get records without period details
        query = query.is('period_number', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate && !!user?.school_id && students.length > 0,
  });

  // Set default section when sections load
  useEffect(() => {
    if (sections.length > 0 && !selectedSection && !isPeriodMode) {
      setSelectedSection(sections[0].id);
    }
  }, [sections.length, selectedSection, isPeriodMode]);

  // Initialize attendance data with stable dependencies
  useEffect(() => {
    if (students.length > 0) {
      const initialData: Record<string, AttendanceRecord> = {};
      
      students.forEach(student => {
        const existing = existingAttendance.find(att => att.student_id === student.id);
        initialData[student.id] = existing || {
          student_id: student.id,
          date: selectedDate,
          status: 'present' as const,
          recorded_by: user?.id || '',
          ...(isPeriodMode && selectedPeriod && {
            period_id: selectedPeriod,
            period_number: teacherPeriods.find(p => p.id === selectedPeriod)?.period_no,
            subject: teacherPeriods.find(p => p.id === selectedPeriod)?.subject
          })
        };
      });
      
      // Only update if the data actually changed
      setAttendanceData(prev => {
        const hasChanged = Object.keys(initialData).some(key => 
          !prev[key] || prev[key].status !== initialData[key].status
        ) || Object.keys(prev).length !== Object.keys(initialData).length;
        
        return hasChanged ? initialData : prev;
      });
    }
  }, [
    // Use primitive values and lengths to avoid object reference issues
    students.map(s => s.id).join(','),
    existingAttendance.map(a => `${a.student_id}-${a.status}`).join(','),
    selectedDate,
    selectedPeriod,
    isPeriodMode,
    teacherPeriods.map(p => p.id).join(','),
    user?.id
  ]);

  // Reset period selection when date changes and invalidate cache
  useEffect(() => {
    if (isPeriodMode) {
      setSelectedPeriod('');
      // Force cache invalidation when date changes
      queryClient.invalidateQueries({ queryKey: ['teacher-periods'] });
    }
  }, [selectedDate, isPeriodMode, queryClient]);

  const markAttendance = useMutation({
    mutationFn: async (attendanceRecords: AttendanceRecord[]) => {
      const records = attendanceRecords.map(record => ({
        ...record,
        school_id: user?.school_id,
        section_id: isPeriodMode ? 
          teacherPeriods.find(p => p.id === selectedPeriod)?.section_id : 
          selectedSection,
        updated_at: new Date().toISOString()
      }));

      if (isPeriodMode) {
        // Handle period-wise attendance with manual upsert
        for (const record of records) {
          const { data: existing, error: selectError } = await supabase
            .from('attendance_records')
            .select('id')
            .eq('student_id', record.student_id)
            .eq('date', record.date)
            .eq('period_number', record.period_number)
            .eq('subject', record.subject);

          if (selectError) throw selectError;

          if (existing && existing.length > 0) {
            // Update existing
            const { error: updateError } = await supabase
              .from('attendance_records')
              .update({
                status: record.status,
                recorded_by: record.recorded_by,
                notes: record.notes,
                updated_at: record.updated_at
              })
              .eq('id', existing[0].id);

            if (updateError) throw updateError;
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('attendance_records')
              .insert(record);

            if (insertError) throw insertError;
          }
        }
      } else {
        // Daily attendance - use upsert
        const { data, error } = await supabase
          .from('attendance_records')
          .upsert(
            records,
            { 
              onConflict: 'student_id,date,section_id',
              ignoreDuplicates: false 
            }
          );

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      Alert.alert('Success', 'Attendance marked successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      refetchAttendance();
      
      // Reset period selection after successful save in period mode
      if (isPeriodMode) {
        setSelectedPeriod('');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    },
  });

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleSubmitAttendance = async () => {
    if (Object.keys(attendanceData).length === 0) {
      Alert.alert('Error', 'No attendance data to submit');
      return;
    }

    // Additional validation for period mode
    if (isPeriodMode && !selectedPeriod) {
      Alert.alert('Error', 'Please select a period first');
      return;
    }

    setIsSubmitting(true);
    try {
      const records = Object.values(attendanceData);
      await markAttendance.mutateAsync(records);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSections(),
      refetchAttendance()
    ]);
    setRefreshing(false);
  };

  const getAttendanceStats = () => {
    const records = Object.values(attendanceData);
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const total = records.length;
    
    return { present, absent, late, excused, total };
  };

  const stats = getAttendanceStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'absent': return '#ef4444';
      case 'late': return '#f59e0b';
      case 'excused': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'absent': return XCircle;
      case 'late': return Clock;
      case 'excused': return FileX;
      default: return UserCheck;
    }
  };

  const renderStudentCard = ({ item: student }: { item: Student }) => {
    const attendance = attendanceData[student.id];
    if (!attendance) return null;

    const StatusIcon = getStatusIcon(attendance.status);

    return (
      <Card style={{ marginBottom: 12 }}>
        <CardContent style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                {student.full_name}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Roll No: {student.admission_no}
              </Text>
            </View>
            <StatusIcon size={20} color={getStatusColor(attendance.status)} />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(student.id, status)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: attendance.status === status 
                    ? getStatusColor(status)
                    : '#f3f4f6',
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: attendance.status === status ? 'white' : '#6b7280',
                  textTransform: 'capitalize'
                }}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderPeriodSelector = () => {
    if (!isPeriodMode) return null;

    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Select Period
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#f3f4f6',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
          onPress={() => setShowPeriodSelector(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <BookOpen size={20} color="#6b7280" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, color: selectedPeriod ? '#111827' : '#6b7280' }}>
              {selectedPeriod ? 
                (() => {
                  const period = teacherPeriods.find(p => p.id === selectedPeriod);
                  return period ? `Period ${period.period_no} - ${period.subject} (Grade ${period.grade}-${period.section})` : 'Select Period';
                })() :
                periodsLoading ? 'Loading periods...' : 
                teacherPeriods.length === 0 ? 'No periods available' : 'Select Period'
              }
            </Text>
          </View>
          <ChevronDown size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>
    );
  };

  if (settingsLoading || sectionsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Activity size={32} color="#6b7280" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Loading attendance settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (settingsError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <AlertTriangle size={48} color="#ef4444" />
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center' }}>
            Unable to Load Settings
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
            There was an error loading your attendance settings. Please try again.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#3b82f6',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              marginTop: 24
            }}
            onPress={() => {
              // Retry by invalidating query
              queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 24, 
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb'
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
              Attendance Management
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              {isPeriodMode ? 'Mark period-wise attendance' : 'Mark daily attendance for your sections'}
            </Text>
          </View>
          <View style={{
            backgroundColor: isPeriodMode ? '#3b82f6' : '#10b981',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16
          }}>
            <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>
              {isPeriodMode ? 'Period Mode' : 'Daily Mode'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Date and Section/Period Selection */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              {isPeriodMode ? 'Select Date & Period' : 'Select Date & Section'}
            </Text>
          </CardHeader>
          <CardContent style={{ padding: 20 }}>
            {/* Date Picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Date
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={20} color="#6b7280" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, color: '#111827' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
                <ArrowRight size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Period Selector (Period Mode) */}
            {renderPeriodSelector()}

            {/* Section Selector (Daily Mode) */}
            {!isPeriodMode && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  Section
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {sections.map((section) => (
                      <TouchableOpacity
                        key={section.id}
                        onPress={() => setSelectedSection(section.id)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          backgroundColor: selectedSection === section.id ? '#3b82f6' : '#f3f4f6',
                          minWidth: 100,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: selectedSection === section.id ? 'white' : '#6b7280'
                        }}>
                          Grade {section.grade}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: selectedSection === section.id ? 'rgba(255,255,255,0.8)' : '#9ca3af'
                        }}>
                          Section {section.section}
                        </Text>
                        {section.class_teacher === user?.id && (
                          <View style={{ 
                            backgroundColor: selectedSection === section.id ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            marginTop: 4
                          }}>
                            <Text style={{ 
                              fontSize: 10, 
                              color: selectedSection === section.id ? 'white' : '#6b7280',
                              fontWeight: '500'
                            }}>
                              Class Teacher
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Validation Message */}
        {isPeriodMode && teacherPeriods.length === 0 && !periodsLoading && (
          <Card style={{ marginBottom: 24, backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
            <CardContent style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AlertTriangle size={20} color="#f59e0b" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 4 }}>
                    No Periods Available
                  </Text>
                  <Text style={{ fontSize: 12, color: '#92400e' }}>
                    You don't have any periods assigned for {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Attendance Stats */}
        {students.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Attendance Summary
              </Text>
            </CardHeader>
            <CardContent style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>
                    {stats.present}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Present</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>
                    {stats.absent}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Absent</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>
                    {stats.late}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Late</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>
                    {stats.excused}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Excused</Text>
                </View>
              </View>
              
              {stats.total > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                    Attendance Rate: {((stats.present / stats.total) * 100).toFixed(1)}%
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* Students List */}
        {((isPeriodMode && selectedPeriod) || (!isPeriodMode && selectedSection)) && students.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Mark Attendance ({students.length} students)
              </Text>
              {isPeriodMode && selectedPeriod && (
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  {(() => {
                    const period = teacherPeriods.find(p => p.id === selectedPeriod);
                    return period ? `${period.subject} - Grade ${period.grade}-${period.section}` : '';
                  })()}
                </Text>
              )}
            </CardHeader>
            <CardContent style={{ padding: 20 }}>
              <FlatList
                data={students}
                renderItem={renderStudentCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {students.length > 0 && (
          <View style={{ marginBottom: 40 }}>
            <Button
              title={isSubmitting ? 'Submitting...' : 'Submit Attendance'}
              onPress={handleSubmitAttendance}
              disabled={isSubmitting || (isPeriodMode && !selectedPeriod)}
              loading={isSubmitting}
              size="lg"
              style={{
                backgroundColor: (isPeriodMode && !selectedPeriod) ? '#9ca3af' : '#3b82f6',
                paddingVertical: 16,
                borderRadius: 12
              }}
            />
          </View>
        )}

        {/* No Students State */}
        {((isPeriodMode && selectedPeriod) || (!isPeriodMode && selectedSection)) && students.length === 0 && !studentsLoading && (
          <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <Users size={48} color="#6b7280" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                No Students Found
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                There are no students enrolled in this {isPeriodMode ? 'period' : 'section'}.
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Loading State for Students */}
        {studentsLoading && (
          <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <Activity size={32} color="#6b7280" />
              <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
                Loading students...
              </Text>
            </CardContent>
          </Card>
        )}

        {/* No Sections State */}
        {!isPeriodMode && sections.length === 0 && (
          <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <GraduationCap size={48} color="#6b7280" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                No Sections Assigned
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                You are not assigned to any sections. Contact your administrator.
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Select Date
            </Text>
            
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              const dayBeforeYesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              
              console.log('Date picker options:');
              console.log('Today:', today);
              console.log('Yesterday:', yesterday);
              console.log('Day Before Yesterday:', dayBeforeYesterday);
              console.log('Current selectedDate:', selectedDate);
              
              return [
                { label: 'Today', date: today },
                { label: 'Yesterday', date: yesterday },
                { label: 'Day Before Yesterday', date: dayBeforeYesterday }
              ];
            })().map((option) => (
              <TouchableOpacity
                key={option.label}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedDate === option.date ? '#3b82f6' + '20' : '#f3f4f6'
                }}
                onPress={() => {
                  console.log('Date picker: Setting date to', option.date);
                  setSelectedDate(option.date);
                  setShowDatePicker(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedDate === option.date ? '#3b82f6' : '#111827',
                  fontWeight: selectedDate === option.date ? '600' : '400'
                }}>
                  {option.label} ({new Date(option.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })})
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                Or enter custom date (YYYY-MM-DD):
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 16
                  }}
                  value={selectedDate}
                  onChangeText={(date) => {
                    console.log('TextInput: Setting date to', date);
                    setSelectedDate(date);
                  }}
                  placeholder="YYYY-MM-DD"
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: '#3b82f6',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    justifyContent: 'center'
                  }}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#6b7280',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 16
              }}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Period Selector Modal */}
      <Modal
        visible={showPeriodSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPeriodSelector(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'flex-end'
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            maxHeight: '70%'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Select Period
            </Text>
            
            <ScrollView>
              {periodsLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Activity size={32} color="#6b7280" />
                  <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16 }}>
                    Loading your periods...
                  </Text>
                </View>
              ) : teacherPeriods.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <BookOpen size={48} color="#6b7280" />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                    No Periods Available
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                    You don't have any periods assigned for this day.
                  </Text>
                </View>
              ) : (
                teacherPeriods.map((period) => (
                  <TouchableOpacity
                    key={period.id}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginBottom: 8,
                      backgroundColor: selectedPeriod === period.id ? '#3b82f6' + '20' : '#f3f4f6',
                      borderWidth: selectedPeriod === period.id ? 1 : 0,
                      borderColor: '#3b82f6'
                    }}
                    onPress={() => {
                      setSelectedPeriod(period.id);
                      setShowPeriodSelector(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <BookOpen size={20} color={selectedPeriod === period.id ? '#3b82f6' : '#6b7280'} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ 
                          fontSize: 16, 
                          fontWeight: '600',
                          color: selectedPeriod === period.id ? '#3b82f6' : '#111827'
                        }}>
                          Period {period.period_no} - {period.subject}
                        </Text>
                        <Text style={{ 
                          fontSize: 14, 
                          color: '#6b7280',
                          marginTop: 2
                        }}>
                          Grade {period.grade}-{period.section} • {period.start_time} - {period.end_time}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={{
                backgroundColor: '#6b7280',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 16
              }}
              onPress={() => setShowPeriodSelector(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};