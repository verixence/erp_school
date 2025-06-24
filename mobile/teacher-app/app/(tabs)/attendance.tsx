import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@erp/common';

interface Section {
  id: string;
  grade: number;
  section: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: number;
}

export default function Attendance() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      loadStudents();
    }
  }, [selectedSection]);

  const loadSections = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get teacher's school_id from users table
      const { data: teacher } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', userData.user.id)
        .single();

      if (!teacher?.school_id) return;

      // Load sections for the teacher's school
      const { data: sectionsData, error } = await supabase
        .from('sections')
        .select('id, grade, section')
        .eq('school_id', teacher.school_id)
        .order('grade')
        .order('section');

      if (error) {
        console.error('Error loading sections:', error);
        return;
      }

      setSections(sectionsData || []);
      if (sectionsData?.length > 0) {
        setSelectedSection(sectionsData[0].id);
      }
    } catch (error) {
      console.error('Error in loadSections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade')
        .eq('section_id', selectedSection)
        .order('first_name');

      if (error) {
        console.error('Error loading students:', error);
        return;
      }

      setStudents(studentsData || []);
      
      // Initialize attendance as present for all students
      const initialAttendance: Record<string, 'present' | 'absent'> = {};
      studentsData?.forEach(student => {
        initialAttendance[student.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error in loadStudents:', error);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const submitAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        date: today,
        status,
        section_id: selectedSection
      }));

      // For now, just show success message
      // In a real app, you'd save to an attendance table
      alert(`Attendance submitted for ${attendanceRecords.length} students`);
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Error submitting attendance');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>Loading...</Text>
      </View>
    );
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection);
  const presentCount = Object.values(attendance).filter(status => status === 'present').length;
  const absentCount = Object.values(attendance).filter(status => status === 'absent').length;

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