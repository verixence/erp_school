import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@erp/common';

interface Section {
  id: string;
  grade: number;
  section: string;
}

interface Period {
  id: string;
  weekday: number;
  period_no: number;
  subject: string;
  teacher_name?: string;
}

export default function Timetable() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);

  const weekdays = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' }
  ];

  const periodNumbers = Array.from({ length: 8 }, (_, i) => i + 1);

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      loadTimetable();
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

  const loadTimetable = async () => {
    try {
      const { data: periodsData, error } = await supabase
        .from('periods')
        .select(`
          id,
          weekday,
          period_no,
          subject,
          teacher:users!periods_teacher_id_fkey(first_name, last_name)
        `)
        .eq('section_id', selectedSection)
        .order('weekday')
        .order('period_no');

      if (error) {
        console.error('Error loading timetable:', error);
        return;
      }

      const formattedPeriods = periodsData?.map((period: any) => ({
        ...period,
        teacher_name: period.teacher 
          ? `${period.teacher.first_name} ${period.teacher.last_name}`
          : undefined
      })) || [];

      setPeriods(formattedPeriods);
    } catch (error) {
      console.error('Error in loadTimetable:', error);
    }
  };

  const getPeriodForSlot = (weekday: number, period_no: number): Period | undefined => {
    return periods.find(p => p.weekday === weekday && p.period_no === period_no);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>Loading...</Text>
      </View>
    );
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Timetable</Text>
          <Text className="text-gray-600">Weekly class schedule</Text>
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

        {/* Timetable Grid */}
        {selectedSectionData && (
          <View className="bg-white rounded-lg shadow-sm">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold">
                Grade {selectedSectionData.grade} - Section {selectedSectionData.section}
              </Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="p-4">
                {/* Header Row */}
                <View className="flex-row mb-2">
                  <View className="w-16 h-12 justify-center items-center">
                    <Text className="font-semibold text-xs text-gray-600">Period</Text>
                  </View>
                  {weekdays.map((day) => (
                    <View key={day.id} className="w-20 h-12 justify-center items-center border-l border-gray-200">
                      <Text className="font-semibold text-xs text-gray-900">{day.short}</Text>
                    </View>
                  ))}
                </View>

                {/* Timetable Rows */}
                {periodNumbers.map((periodNo) => (
                  <View key={periodNo} className="flex-row border-t border-gray-100">
                    <View className="w-16 h-16 justify-center items-center bg-gray-50">
                      <Text className="font-medium text-xs text-gray-700">{periodNo}</Text>
                    </View>
                    {weekdays.map((day) => {
                      const period = getPeriodForSlot(day.id, periodNo);
                      return (
                        <View key={`${day.id}-${periodNo}`} className="w-20 h-16 border-l border-gray-200 p-1">
                          {period ? (
                            <View className="flex-1 justify-center items-center bg-indigo-50 rounded px-1">
                              <Text className="text-xs font-medium text-indigo-900 text-center" numberOfLines={2}>
                                {period.subject}
                              </Text>
                              {period.teacher_name && (
                                <Text className="text-xs text-indigo-600 text-center mt-1" numberOfLines={1}>
                                  {period.teacher_name.split(' ')[0]}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <View className="flex-1 justify-center items-center">
                              <Text className="text-xs text-gray-400">-</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Legend */}
        <View className="bg-white rounded-lg p-4 mt-4 shadow-sm">
          <Text className="text-lg font-semibold mb-3">Today's Classes</Text>
          {periods.length > 0 ? (
            <View>
              {/* Show today's schedule */}
              {(() => {
                const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
                const todayWeekday = today === 0 ? 7 : today; // Convert to our 1-7 system
                const todaysClasses = periods.filter(p => p.weekday === todayWeekday).sort((a, b) => a.period_no - b.period_no);
                
                if (todaysClasses.length === 0) {
                  return <Text className="text-gray-600">No classes scheduled for today</Text>;
                }
                
                return todaysClasses.map((period) => (
                  <View key={period.id} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                    <View>
                      <Text className="font-medium text-gray-900">Period {period.period_no}</Text>
                      <Text className="text-sm text-gray-600">{period.subject}</Text>
                    </View>
                    {period.teacher_name && (
                      <Text className="text-sm text-indigo-600">{period.teacher_name}</Text>
                    )}
                  </View>
                ));
              })()}
            </View>
          ) : (
            <Text className="text-gray-600">No timetable available for this section</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
} 