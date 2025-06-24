import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  useTeacherSections,
  useSectionStudents,
  useAttendanceRecords,
  useSaveAttendance,
  type Student,
  type AttendanceRecord,
} from '@erp/common';

interface AttendanceItemProps {
  student: Student;
  status: 'present' | 'absent' | 'late' | 'excused';
  onStatusChange: (status: 'present' | 'absent' | 'late' | 'excused') => void;
}

function AttendanceItem({ student, status, onStatusChange }: AttendanceItemProps) {
  const statusConfig = {
    present: { color: 'bg-green-500', icon: 'checkmark-circle' as const, text: 'Present' },
    absent: { color: 'bg-red-500', icon: 'close-circle' as const, text: 'Absent' },
    late: { color: 'bg-yellow-500', icon: 'time' as const, text: 'Late' },
    excused: { color: 'bg-blue-500', icon: 'information-circle' as const, text: 'Excused' },
  };

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-3">
      <Text className="text-lg font-medium text-gray-900 mb-3">
        {student.full_name}
      </Text>
      <Text className="text-sm text-gray-600 mb-3">
        {student.admission_no} • {student.grade} {student.section}
      </Text>
      
      <View className="flex-row justify-between">
        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((statusKey) => {
          const config = statusConfig[statusKey];
          const isSelected = status === statusKey;
          
          return (
            <TouchableOpacity
              key={statusKey}
              className={`flex-1 mx-1 p-3 rounded-lg ${
                isSelected ? config.color : 'bg-gray-100'
              }`}
              onPress={() => onStatusChange(statusKey)}
            >
              <Ionicons
                name={config.icon}
                size={20}
                color={isSelected ? 'white' : '#6b7280'}
                style={{ alignSelf: 'center', marginBottom: 4 }}
              />
              <Text
                className={`text-center text-xs font-medium ${
                  isSelected ? 'text-white' : 'text-gray-600'
                }`}
              >
                {config.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function Attendance() {
  const { data: authData } = useAuth();
  const user = authData?.user;
  
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});

  const { data: sections = [] } = useTeacherSections(user?.id);
  
  // Parse selected section to get grade and section
  const [grade, section] = selectedSection.split(' ');
  
  const { data: students = [], isLoading: studentsLoading } = useSectionStudents(
    grade,
    section,
    user?.school_id
  );

  const studentIds = students.map(s => s.id);
  const { data: existingRecords = [] } = useAttendanceRecords(selectedDate, studentIds);
  
  const saveAttendanceMutation = useSaveAttendance();

  // Initialize attendance data when students or existing records change
  useEffect(() => {
    const newAttendanceData: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    
    students.forEach(student => {
      const existingRecord = existingRecords.find(r => r.student_id === student.id);
      newAttendanceData[student.id] = existingRecord?.status || 'present';
    });
    
    setAttendanceData(newAttendanceData);
  }, [students, existingRecords]);

  const handleSaveAttendance = async () => {
    if (!user?.school_id || !students.length) return;

    const records: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>[] = students.map(student => ({
      school_id: user.school_id!,
      student_id: student.id,
      date: selectedDate,
      status: attendanceData[student.id] || 'present',
      recorded_by: user.id,
    }));

    try {
      await saveAttendanceMutation.mutateAsync(records);
      Alert.alert('Success', 'Attendance saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save attendance');
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Mark Attendance</Text>

        {/* Section Selection */}
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Select Section</Text>
          <View className="border border-gray-300 rounded-lg">
            <Picker
              selectedValue={selectedSection}
              onValueChange={setSelectedSection}
              style={{ height: 50 }}
            >
              <Picker.Item label="Choose a section..." value="" />
              {sections.map(section => (
                <Picker.Item
                  key={section.id}
                  label={`${section.grade} ${section.section}`}
                  value={`${section.grade} ${section.section}`}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date Selection */}
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Date</Text>
          <Text className="text-lg text-gray-900">{selectedDate}</Text>
        </View>

        {/* Students List */}
        {selectedSection && (
          <>
            {studentsLoading ? (
              <View className="bg-white rounded-lg p-8 shadow-sm">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-center text-gray-600 mt-4">Loading students...</Text>
              </View>
            ) : students.length > 0 ? (
              <>
                <Text className="text-lg font-semibold text-gray-900 mb-4">
                  Students ({students.length})
                </Text>
                
                {students.map(student => (
                  <AttendanceItem
                    key={student.id}
                    student={student}
                    status={attendanceData[student.id] || 'present'}
                    onStatusChange={(status) =>
                      setAttendanceData(prev => ({ ...prev, [student.id]: status }))
                    }
                  />
                ))}

                <TouchableOpacity
                  className={`bg-primary-600 rounded-lg py-4 mt-6 ${
                    saveAttendanceMutation.isPending ? 'opacity-50' : ''
                  }`}
                  onPress={handleSaveAttendance}
                  disabled={saveAttendanceMutation.isPending}
                >
                  <Text className="text-white text-center font-medium text-lg">
                    {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="bg-white rounded-lg p-8 shadow-sm">
                <Text className="text-center text-gray-600">
                  No students found in this section
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
} 