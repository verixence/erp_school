import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCurrentUser, 
  getTeacherSections, 
  getSectionStudents, 
  getAttendanceRecords, 
  saveAttendanceRecords 
} from '../../lib/api';

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
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});

  // Get current user
  const { data: user, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (userError) {
      Alert.alert('Error', 'Failed to load user data');
    }
  }, [userError]);

  // Fetch teacher's sections
  const { data: sectionsResponse, error: sectionsError } = useQuery({
    queryKey: ['teacher-sections', user?.data?.id],
    queryFn: () => getTeacherSections(user?.data?.id || ''),
    enabled: !!user?.data?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const sections = sectionsResponse?.data || [];

  useEffect(() => {
    if (sectionsError) {
      Alert.alert('Error', 'Failed to load sections');
    }
  }, [sectionsError]);

  // Get selected section details
  const selectedSectionData = sections.find(s => s.id === selectedSection);

  // Fetch students for selected section
  const { data: studentsResponse, error: studentsError } = useQuery({
    queryKey: ['section-students', user?.data?.school_id, selectedSectionData?.grade, selectedSectionData?.section],
    queryFn: () => getSectionStudents(
      user?.data?.school_id || '', 
      selectedSectionData?.grade || '', 
      selectedSectionData?.section || ''
    ),
    enabled: !!user?.data?.school_id && !!selectedSectionData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const students = studentsResponse?.data || [];

  useEffect(() => {
    if (studentsError) {
      Alert.alert('Error', 'Failed to load students');
    }
  }, [studentsError]);

  // Fetch existing attendance for selected date and section
  const { data: existingAttendanceResponse, error: attendanceError } = useQuery({
    queryKey: ['attendance', user?.data?.school_id, selectedDate, students.map(s => s.id)],
    queryFn: () => getAttendanceRecords(
      user?.data?.school_id || '',
      selectedDate,
      students.map(s => s.id)
    ),
    enabled: !!user?.data?.school_id && !!selectedDate && students.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const existingAttendance = existingAttendanceResponse?.data || [];

  useEffect(() => {
    if (attendanceError) {
      Alert.alert('Error', 'Failed to load attendance records');
    }
  }, [attendanceError]);

  // Initialize attendance data when existing records are loaded
  useEffect(() => {
    if (students.length > 0) {
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
    if (sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
    }
  }, [sections, selectedSection]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection || !selectedDate || !user?.data?.school_id) {
        throw new Error('Missing required data');
      }

      const records = Object.values(attendanceData).map(record => ({
        school_id: user.data.school_id,
        student_id: record.student_id,
        date: selectedDate,
        status: record.status,
        recorded_by: user.data.id,
        notes: record.notes || null
      }));

      const result = await saveAttendanceRecords(records);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Attendance saved successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save attendance');
    },
  });

  const updateAttendance = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      case 'excused': return 'bg-blue-500';
      default: return 'bg-gray-500';
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
    const records = Object.values(attendanceData);
    return {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
    };
  };

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <Text style={{ color: '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

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
                <Text className="text-2xl font-bold text-green-600">{summary.present}</Text>
                <Text className="text-gray-600">Present</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-red-600">{summary.absent}</Text>
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
                onPress={() => updateAttendance(student.id, 'present')}
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
                  attendanceData[student.id]?.status === 'present'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}>
                  <Text className={`font-medium ${
                    attendanceData[student.id]?.status === 'present'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {attendanceData[student.id]?.status === 'present' ? 'Present' : 'Absent'}
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
            onPress={() => saveAttendanceMutation.mutate()}
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