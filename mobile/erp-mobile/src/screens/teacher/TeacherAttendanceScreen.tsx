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
  Target
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

interface AttendanceRecord {
  id?: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  period_number?: number;
  subject?: string;
  recorded_by: string;
  notes?: string;
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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceMode, setAttendanceMode] = useState<'daily' | 'period'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // Fetch attendance settings
  const { data: attendanceSettings } = useQuery({
    queryKey: ['attendance-settings', user?.school_id],
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!user?.school_id) throw new Error('No school ID');

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
          attendance_mode: 'daily',
          notify_parents: true,
          grace_period_minutes: 15,
          auto_mark_present: false
        };
      }

      return {
        attendance_mode: schoolData.attendance_mode || 'daily',
        notify_parents: true,
        grace_period_minutes: 15,
        auto_mark_present: false
      };
    },
    enabled: !!user?.school_id,
  });

  // Fetch students for selected section
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['section-students', selectedSection],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedSection) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, section_id')
        .eq('section_id', selectedSection)
        .eq('school_id', user?.school_id)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection && !!user?.school_id,
  });

  // Fetch existing attendance for the selected date and section
  const { data: existingAttendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', selectedSection, selectedDate],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!selectedSection || !selectedDate) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', selectedDate)
        .eq('school_id', user?.school_id)
        .in('student_id', students.map(s => s.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection && !!selectedDate && !!user?.school_id,
  });

  // Set default section when sections load
  useEffect(() => {
    if (sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
    }
  }, [sections.length, selectedSection]);

  // Initialize attendance data when students or existing attendance changes
  useEffect(() => {
    if (students.length > 0) {
      const initialData: Record<string, AttendanceRecord> = {};
      
      students.forEach(student => {
        const existing = existingAttendance.find(att => att.student_id === student.id);
        initialData[student.id] = existing || {
          student_id: student.id,
          date: selectedDate,
          status: 'present' as const,
          recorded_by: user?.id || ''
        };
      });
      
      // Only update if the data has actually changed
      setAttendanceData(prevData => {
        const hasChanges = students.some(student => {
          const existing = existingAttendance.find(att => att.student_id === student.id);
          const newRecord = existing || {
            student_id: student.id,
            date: selectedDate,
            status: 'present' as const,
            recorded_by: user?.id || ''
          };
          const prevRecord = prevData[student.id];
          return !prevRecord || 
                 prevRecord.status !== newRecord.status || 
                 prevRecord.date !== newRecord.date;
        });
        
        return hasChanges ? initialData : prevData;
      });
    }
  }, [students.length, existingAttendance.length, selectedDate, user?.id]);

  // Update attendance mode based on settings
  useEffect(() => {
    if (attendanceSettings) {
      setAttendanceMode(attendanceSettings.attendance_mode === 'per_period' ? 'period' : 'daily');
    }
  }, [attendanceSettings]);

  const markAttendance = useMutation({
    mutationFn: async (attendanceRecords: AttendanceRecord[]) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(
          attendanceRecords.map(record => ({
            ...record,
            school_id: user?.school_id,
            section_id: selectedSection,
            updated_at: new Date().toISOString()
          })),
          { 
            onConflict: 'student_id,date,section_id',
            ignoreDuplicates: false 
          }
        );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Attendance marked successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      refetchAttendance();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    },
  });

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
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
    const total = records.length;
    
    return { present, absent, late, total };
  };

  const stats = getAttendanceStats();

  const renderStudentCard = ({ item: student }: { item: Student }) => {
    const attendance = attendanceData[student.id];
    if (!attendance) return null;

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
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['present', 'absent', 'late'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(student.id, status)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: attendance.status === status 
                    ? status === 'present' ? '#10b981' 
                      : status === 'absent' ? '#ef4444' 
                      : '#f59e0b'
                    : '#f3f4f6',
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 14,
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

  if (sectionsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Activity size={32} color="#6b7280" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Loading sections...</Text>
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
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          Attendance Management
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          Mark attendance for your assigned sections
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Date and Section Selection */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              Select Date & Section
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
                    {new Date(selectedDate).toLocaleDateString('en-US', {
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

            {/* Section Picker */}
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
          </CardContent>
        </Card>

        {/* Attendance Stats */}
        {students.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Today's Summary
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
                    {stats.total}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Total</Text>
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
        {selectedSection && students.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Mark Attendance ({students.length} students)
              </Text>
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
              disabled={isSubmitting}
              loading={isSubmitting}
              size="lg"
              style={{
                backgroundColor: '#3b82f6',
                paddingVertical: 16,
                borderRadius: 12
              }}
            />
          </View>
        )}

        {/* No Students State */}
        {selectedSection && students.length === 0 && !studentsLoading && (
          <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <Users size={48} color="#6b7280" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                No Students Found
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                There are no students enrolled in this section.
              </Text>
            </CardContent>
          </Card>
        )}

        {/* No Sections State */}
        {sections.length === 0 && (
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
            
            {/* Quick Date Options */}
            <View style={{ marginBottom: 16 }}>
              {[
                { label: 'Today', date: new Date().toISOString().split('T')[0] },
                { label: 'Yesterday', date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
                { label: 'Day Before Yesterday', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
              ].map((option) => (
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
            </View>

            {/* Manual Date Input */}
            <View style={{ marginBottom: 16 }}>
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
                  onChangeText={setSelectedDate}
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
                alignItems: 'center'
              }}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}; 