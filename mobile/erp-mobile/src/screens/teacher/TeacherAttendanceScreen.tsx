import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView, Dimensions, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Clock,
  BookOpen,
  Save,
  RotateCcw,
  UserCheck,
  AlertCircle,
  ChevronDown,
  Activity,
  Target,
  Zap,
  Filter,
  GraduationCap
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Section {
  id: string;
  grade: number;
  section: string;
  school_id: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: number;
  section: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface Period {
  id: string;
  section_id: string;
  period_no: number;
  subject: string;
  teacher_id: string;
  weekday: number;
  start_time?: string;
  end_time?: string;
  grade: number;
  section: string;
}

export const TeacherAttendanceScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceMode, setAttendanceMode] = useState<'daily' | 'period'>('daily');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);
  
  // Modal states for selectors
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // Memoize the current weekday calculation to prevent infinite re-renders
  const currentWeekday = useMemo(() => {
    const date = new Date(selectedDate + 'T00:00:00');
    const day = date.getDay();
    return day === 0 ? 7 : day; // Convert to 1=Monday, 7=Sunday
  }, [selectedDate]);

  // Fetch teacher's sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
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
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (error) throw error;
      
      return data?.map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        school_id: item.sections.school_id
      })) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch periods for selected section (for period-based attendance)
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['section-periods', selectedSection, currentWeekday, attendanceMode],
    queryFn: async (): Promise<Period[]> => {
      if (!selectedSection) return [];

      console.log('Fetching periods for:', { selectedSection, currentWeekday, teacherId: user?.id });

      // Try the exact teacher assignment first
      let result = await supabase
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
        .eq('section_id', selectedSection)
        .eq('weekday', currentWeekday)
        .eq('teacher_id', user?.id)
        .order('period_no');

      console.log('Direct teacher query result:', { data: result.data, error: result.error });

      if (result.data && result.data.length > 0) {
        return result.data.map((item: any) => ({
          ...item,
          grade: item.sections.grade,
          section: item.sections.section
        }));
      }

      // If no direct periods found, try without teacher restriction for debugging
      // (Teacher might be assigned via section_teachers but not directly in periods)
      console.log('No direct periods found, trying without teacher restriction...');
      
      result = await supabase
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
        .eq('section_id', selectedSection)
        .eq('weekday', currentWeekday)
        .order('period_no');

      console.log('All periods for section and day:', { data: result.data, error: result.error });

      if (result.error) {
        console.error('Error fetching periods:', result.error);
        throw result.error;
      }
      
      return result.data?.map((item: any) => ({
        ...item,
        grade: item.sections.grade,
        section: item.sections.section
      })) || [];
    },
    enabled: !!selectedSection && !!user?.id,
  });

  // Fetch students for selected section
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['section-students', selectedSection],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedSection) return [];

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          admission_no,
          sections!inner(grade, section)
        `)
        .eq('section_id', selectedSection)
        .eq('school_id', user?.school_id)
        .order('full_name');

      if (error) throw error;
      
      return data?.map((student: any) => ({
        ...student,
        grade: student.sections.grade,
        section: student.sections.section
      })) || [];
    },
    enabled: !!selectedSection,
  });

  // Fetch existing attendance for the selected date
  const { data: existingAttendance = {} } = useQuery({
    queryKey: ['existing-attendance', selectedSection, selectedDate, selectedPeriod],
    queryFn: async (): Promise<Record<string, AttendanceRecord>> => {
      if (!selectedSection || !selectedDate) return {};

      let query = supabase
        .from('attendance_records')
        .select('student_id, status, notes')
        .eq('date', selectedDate)
        .eq('school_id', user?.school_id);

      // Filter by students in the selected section
      const sectionStudents = await supabase
        .from('students')
        .select('id')
        .eq('section_id', selectedSection);

      if (sectionStudents.data) {
        const studentIds = sectionStudents.data.map(s => s.id);
        query = query.in('student_id', studentIds);
      }

      if (attendanceMode === 'period' && selectedPeriod) {
        query = query.eq('period_id', selectedPeriod);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const attendanceMap: Record<string, AttendanceRecord> = {};
      data?.forEach((record: any) => {
        attendanceMap[record.student_id] = {
          student_id: record.student_id,
          status: record.status,
          notes: record.notes
        };
      });
      
      return attendanceMap;
    },
    enabled: !!selectedSection && !!selectedDate,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Compute merged attendance data (existing + current changes)
  const mergedAttendanceData = React.useMemo(() => {
    // Only merge if we have actual data to avoid unnecessary re-computations
    if (Object.keys(existingAttendance).length === 0 && Object.keys(attendanceData).length === 0) {
      return {};
    }
    return { ...existingAttendance, ...attendanceData };
  }, [Object.keys(existingAttendance).length, Object.keys(attendanceData).length, selectedSection, selectedDate]);

  // Initialize attendance data when students change and set default to present
  React.useEffect(() => {
    if (students.length > 0) {
      const defaultAttendance: Record<string, AttendanceRecord> = {};
      students.forEach(student => {
        const existingRecord = existingAttendance[student.id];
        if (!existingRecord && !attendanceData[student.id]) {
          // Default to present for new students only if no data exists
          defaultAttendance[student.id] = {
            student_id: student.id,
            status: 'present'
          };
        }
      });
      
      // Only update if there are new defaults to set
      if (Object.keys(defaultAttendance).length > 0) {
        setAttendanceData(prev => ({ ...defaultAttendance, ...prev }));
      }
    }
  }, [students.length, selectedSection, selectedDate]); // Stable dependencies

  // Set default section when sections load
  React.useEffect(() => {
    if (sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
    }
  }, [sections, selectedSection]);

  // Set default period when periods load
  React.useEffect(() => {
    if (periods.length > 0 && !selectedPeriod && attendanceMode === 'period') {
      setSelectedPeriod(periods[0].id);
    }
  }, [periods, selectedPeriod, attendanceMode]);

  // Reset attendance data when section or date changes
  React.useEffect(() => {
    setAttendanceData({});
  }, [selectedSection, selectedDate, selectedPeriod]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection || !selectedDate) throw new Error('Missing required fields');

      const attendanceRecords = Object.values(mergedAttendanceData).map(record => ({
        student_id: record.student_id,
        date: selectedDate,
        status: record.status,
        notes: record.notes || null,
        period_id: attendanceMode === 'period' ? selectedPeriod : null,
        period_number: attendanceMode === 'period' ? selectedPeriod : null,
        subject: attendanceMode === 'period' ? periods.find(p => p.id === selectedPeriod)?.subject : null,
        recorded_by: user?.id,
        school_id: user?.school_id
      }));

      // Delete existing records first
      const sectionStudents = await supabase
        .from('students')
        .select('id')
        .eq('section_id', selectedSection);

      if (sectionStudents.data) {
        const studentIds = sectionStudents.data.map(s => s.id);
        
        let deleteQuery = supabase
          .from('attendance_records')
          .delete()
          .eq('date', selectedDate)
          .eq('school_id', user?.school_id)
          .in('student_id', studentIds);

        if (attendanceMode === 'period' && selectedPeriod) {
          deleteQuery = deleteQuery.eq('period_id', selectedPeriod);
        } else if (attendanceMode === 'daily') {
          deleteQuery = deleteQuery.is('period_id', null);
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError) throw deleteError;
      }

      // Insert new records
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecords);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Attendance saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['existing-attendance'] });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
      console.error('Save attendance error:', error);
    }
  });

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        status,
        notes: prev[studentId]?.notes
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (Object.keys(mergedAttendanceData).length === 0) {
      Alert.alert('No Data', 'Please mark attendance for at least one student.');
      return;
    }

    setSaving(true);
    try {
      await saveAttendanceMutation.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const newAttendanceData: Record<string, AttendanceRecord> = {};
    students.forEach(student => {
      newAttendanceData[student.id] = {
        student_id: student.id,
        status: 'present'
      };
    });
    setAttendanceData(prev => ({ ...prev, ...newAttendanceData }));
  };

  const resetAttendance = () => {
    setAttendanceData({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'absent': return '#ef4444';
      case 'late': return '#f59e0b';
      case 'excused': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusCount = (status: string) => {
    return Object.values(mergedAttendanceData).filter(record => record.status === status).length;
  };

  const currentSection = sections.find(s => s.id === selectedSection);
  const currentPeriod = periods.find(p => p.id === selectedPeriod);

  // Date picker helper
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Enhanced Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 24, 
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <UserCheck size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Mark Attendance
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Track student attendance efficiently
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={{ gap: 12 }}>
          {/* Section and Date Row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
                Section
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db'
                }}
                onPress={() => setShowSectionModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <GraduationCap size={16} color="#6b7280" />
                  <Text style={{ fontSize: 14, color: '#111827', marginLeft: 8 }}>
                    {currentSection ? `Grade ${currentSection.grade} - ${currentSection.section}` : 'Select section'}
                  </Text>
                </View>
                <ChevronDown size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
                Date
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db'
                }}
                onPress={() => setShowDateModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={16} color="#6b7280" />
                  <Text style={{ fontSize: 14, color: '#111827', marginLeft: 8 }}>
                    {new Date(selectedDate).toLocaleDateString()}
                  </Text>
                </View>
                <ChevronDown size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendance Mode Toggle */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
              Attendance Mode
            </Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 2 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: attendanceMode === 'daily' ? '#3b82f6' : 'transparent'
                }}
                onPress={() => setAttendanceMode('daily')}
              >
                <Text style={{ 
                  textAlign: 'center', 
                  fontSize: 14, 
                  fontWeight: '500',
                  color: attendanceMode === 'daily' ? 'white' : '#6b7280'
                }}>
                  Daily
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: attendanceMode === 'period' ? '#3b82f6' : 'transparent'
                }}
                onPress={() => setAttendanceMode('period')}
              >
                <Text style={{ 
                  textAlign: 'center', 
                  fontSize: 14, 
                  fontWeight: '500',
                  color: attendanceMode === 'period' ? 'white' : '#6b7280'
                }}>
                  Period
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Period Selector (if period mode) */}
          {attendanceMode === 'period' && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
                Period
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db'
                }}
                onPress={() => setShowPeriodModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={16} color="#6b7280" />
                  <Text style={{ fontSize: 14, color: '#111827', marginLeft: 8 }}>
                    {currentPeriod ? `Period ${currentPeriod.period_no} - ${currentPeriod.subject}` : 
                     periods.length === 0 ? 
                     (periodsLoading ? 'Loading periods...' : 'No periods found') : 
                     'Select period'}
                  </Text>
                </View>
                <ChevronDown size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 20 }}>
        {/* Statistics */}
        {students.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Activity size={20} color="#111827" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
                Today's Statistics
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              <View style={{ width: '25%', paddingHorizontal: 6, marginBottom: 12 }}>
                <Card>
                  <CardContent style={{ padding: 12, alignItems: 'center' }}>
                    <View style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 16, 
                      backgroundColor: '#10b981' + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <CheckCircle size={16} color="#10b981" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                      {getStatusCount('present')}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#6b7280' }}>
                      Present
                    </Text>
                  </CardContent>
                </Card>
              </View>

              <View style={{ width: '25%', paddingHorizontal: 6, marginBottom: 12 }}>
                <Card>
                  <CardContent style={{ padding: 12, alignItems: 'center' }}>
                    <View style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 16, 
                      backgroundColor: '#ef4444' + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <XCircle size={16} color="#ef4444" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                      {getStatusCount('absent')}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#6b7280' }}>
                      Absent
                    </Text>
                  </CardContent>
                </Card>
              </View>

              <View style={{ width: '25%', paddingHorizontal: 6, marginBottom: 12 }}>
                <Card>
                  <CardContent style={{ padding: 12, alignItems: 'center' }}>
                    <View style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 16, 
                      backgroundColor: '#f59e0b' + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <Clock size={16} color="#f59e0b" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                      {getStatusCount('late')}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#6b7280' }}>
                      Late
                    </Text>
                  </CardContent>
                </Card>
              </View>

              <View style={{ width: '25%', paddingHorizontal: 6, marginBottom: 12 }}>
                <Card>
                  <CardContent style={{ padding: 12, alignItems: 'center' }}>
                    <View style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 16, 
                      backgroundColor: '#8b5cf6' + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <AlertCircle size={16} color="#8b5cf6" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                      {getStatusCount('excused')}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#6b7280' }}>
                      Excused
                    </Text>
                  </CardContent>
                </Card>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Zap size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Quick Actions
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              title="Mark All Present"
              onPress={markAllPresent}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Reset"
              onPress={resetAttendance}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Student List */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Users size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Student Attendance ({students.length})
            </Text>
          </View>
          
          {students.length > 0 ? (
            <View style={{ gap: 12 }}>
              {students.map((student, index) => {
                const currentStatus = mergedAttendanceData[student.id]?.status || 'present';
                
                return (
                  <Card key={student.id}>
                    <CardContent style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 20, 
                          backgroundColor: getStatusColor(currentStatus) + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: 'bold', 
                            color: getStatusColor(currentStatus) 
                          }}>
                            {student.full_name.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            {student.full_name}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#6b7280' }}>
                            Roll No: {student.admission_no}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: currentStatus === status ? getStatusColor(status) : getStatusColor(status) + '20',
                              borderWidth: 1,
                              borderColor: currentStatus === status ? getStatusColor(status) : getStatusColor(status) + '40'
                            }}
                            onPress={() => handleAttendanceChange(student.id, status)}
                          >
                            <Text style={{
                              textAlign: 'center',
                              fontSize: 12,
                              fontWeight: '500',
                              color: currentStatus === status ? 'white' : getStatusColor(status),
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
              })}
            </View>
          ) : (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <Users size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  No Students Found
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  No students found in the selected section.
                </Text>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Save Button */}
        {students.length > 0 && (
          <View style={{ marginBottom: 40 }}>
            <Button
              title={saving ? "Saving..." : "Save Attendance"}
              onPress={handleSaveAttendance}
              loading={saving}
              disabled={Object.keys(mergedAttendanceData).length === 0}
              style={{ 
                height: 56,
                backgroundColor: '#10b981'
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Section Selector Modal */}
      <Modal
        visible={showSectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSectionModal(false)}
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
            paddingTop: 20,
            maxHeight: '70%'
          }}>
            <View style={{ 
              paddingHorizontal: 24, 
              paddingBottom: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#e5e7eb' 
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Select Section
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {sections.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    backgroundColor: selectedSection === section.id ? '#f3f4f6' : 'white'
                  }}
                  onPress={() => {
                    setSelectedSection(section.id);
                    setShowSectionModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedSection === section.id ? '#3b82f6' : '#111827',
                    fontWeight: selectedSection === section.id ? '600' : '400'
                  }}>
                    Grade {section.grade} - {section.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ padding: 16 }}>
              <Button
                title="Cancel"
                onPress={() => setShowSectionModal(false)}
                variant="outline"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Selector Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
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
            paddingTop: 20,
            maxHeight: '70%'
          }}>
            <View style={{ 
              paddingHorizontal: 24, 
              paddingBottom: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#e5e7eb' 
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Select Date
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {generateDateOptions().map((date) => (
                <TouchableOpacity
                  key={date}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    backgroundColor: selectedDate === date ? '#f3f4f6' : 'white'
                  }}
                  onPress={() => {
                    setSelectedDate(date);
                    setShowDateModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedDate === date ? '#3b82f6' : '#111827',
                    fontWeight: selectedDate === date ? '600' : '400'
                  }}>
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ padding: 16 }}>
              <Button
                title="Cancel"
                onPress={() => setShowDateModal(false)}
                variant="outline"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Period Selector Modal */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
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
            paddingTop: 20,
            maxHeight: '70%'
          }}>
            <View style={{ 
              paddingHorizontal: 24, 
              paddingBottom: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#e5e7eb' 
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Select Period
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {periods.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
                    {periodsLoading ? 'Loading periods...' : 'No periods found for this section and day.\nCheck your schedule or try a different day.'}
                  </Text>
                </View>
              ) : (
                periods.map((period) => (
                <TouchableOpacity
                  key={period.id}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    backgroundColor: selectedPeriod === period.id ? '#f3f4f6' : 'white'
                  }}
                  onPress={() => {
                    setSelectedPeriod(period.id);
                    setShowPeriodModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedPeriod === period.id ? '#3b82f6' : '#111827',
                    fontWeight: selectedPeriod === period.id ? '600' : '400'
                  }}>
                    Period {period.period_no} - {period.subject}
                  </Text>
                  {period.start_time && period.end_time && (
                    <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                      {period.start_time} - {period.end_time}
                    </Text>
                  )}
                </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <View style={{ padding: 16 }}>
              <Button
                title="Cancel"
                onPress={() => setShowPeriodModal(false)}
                variant="outline"
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}; 