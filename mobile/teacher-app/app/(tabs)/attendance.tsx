import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface Section {
  id: string;
  grade: string;
  section: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export default function Attendance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, role, school_id')
            .eq('id', session.user.id)
            .single();
          
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };

    getUser();
  }, []);

  // Fetch sections where this teacher is assigned (using section_teachers junction table)
  const { data: sections } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) throw new Error('No user ID');

      // Get sections via section_teachers junction table
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
      
      // Transform the data to match the expected Section interface
      const sectionsData = data?.map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
      })) || [];

      return sectionsData;
    },
    enabled: !!user?.id,
  });

  // Fetch students for selected section
  const { data: students } = useQuery({
    queryKey: ['section-students', selectedSection],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedSection) return [];

      const { data: sectionData } = await supabase
        .from('sections')
        .select('grade, section')
        .eq('id', selectedSection)
        .single();

      if (!sectionData) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .eq('school_id', user?.school_id)
        .eq('grade', sectionData.grade)
        .eq('section', sectionData.section)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection && !!user?.school_id,
  });

  // Fetch existing attendance for selected date and section
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance', selectedSection, selectedDate],
    queryFn: async () => {
      if (!selectedSection || !selectedDate || !students?.length) return [];

      const studentIds = students.map(s => s.id);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, status, notes')
        .eq('school_id', user?.school_id)
        .eq('date', selectedDate)
        .in('student_id', studentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection && !!selectedDate && !!students?.length,
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

  // Set first section as default
  useEffect(() => {
    if (sections && sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
    }
  }, [sections, selectedSection]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection || !selectedDate || !user?.school_id) {
        throw new Error('Missing required data');
      }

      const records = Object.values(attendanceData).map(record => ({
        school_id: user.school_id,
        student_id: record.student_id,
        date: selectedDate,
        status: record.status,
        recorded_by: user.id,
        notes: record.notes || null
      }));

      // Use upsert to handle existing records
      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, {
          onConflict: 'student_id,date',
          ignoreDuplicates: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Attendance saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', `Failed to save attendance: ${error.message}`);
    },
  });

  const updateAttendance = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'check-circle';
      case 'absent': return 'cancel';
      case 'late': return 'schedule';
      case 'excused': return 'info';
      default: return 'help';
    }
  };

  const getAttendanceSummary = () => {
    const statuses = Object.values(attendanceData);
    return {
      present: statuses.filter(s => s.status === 'present').length,
      absent: statuses.filter(s => s.status === 'absent').length,
      late: statuses.filter(s => s.status === 'late').length,
      excused: statuses.filter(s => s.status === 'excused').length,
      total: statuses.length
    };
  };

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <Text style={{ color: '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  const selectedSectionData = sections?.find(s => s.id === selectedSection);
  const summary = getAttendanceSummary();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Attendance</Text>
          <Text className="text-gray-600">Mark today's attendance</Text>
        </View>

        {/* Section Selector */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="text-lg font-semibold mb-3">Select Section</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {sections.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  onPress={() => setSelectedSection(section.id)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedSection === section.id
                      ? 'bg-indigo-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text className={`font-medium ${
                    selectedSection === section.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    Grade {section.grade} - {section.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Attendance Summary */}
        {selectedSectionData && (
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold mb-3">
              Grade {selectedSectionData.grade} - Section {selectedSectionData.section}
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-green-600">{presentCount}</Text>
                <Text className="text-gray-600">Present</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-red-600">{absentCount}</Text>
                <Text className="text-gray-600">Absent</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-gray-600">{students.length}</Text>
                <Text className="text-gray-600">Total</Text>
              </View>
            </View>
          </View>
        )}

        {/* Student List */}
        <View className="bg-white rounded-lg shadow-sm">
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold">Students</Text>
          </View>
          {students.length > 0 ? (
            students.map((student, index) => (
              <TouchableOpacity
                key={student.id}
                onPress={() => toggleAttendance(student.id)}
                className={`p-4 flex-row justify-between items-center ${
                  index !== students.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <View>
                  <Text className="text-lg font-medium text-gray-900">
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text className="text-gray-600">Grade {student.grade}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${
                  attendance[student.id] === 'present'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}>
                  <Text className={`font-medium ${
                    attendance[student.id] === 'present'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {attendance[student.id] === 'present' ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="p-8 items-center">
              <Text className="text-gray-600">No students found in this section</Text>
            </View>
          )}
        </View>

        {/* Submit Button */}
        {students.length > 0 && (
          <TouchableOpacity
            onPress={submitAttendance}
            className="bg-indigo-600 rounded-lg p-4 mt-4 shadow-sm"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Submit Attendance
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
} 