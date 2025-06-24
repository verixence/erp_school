import { View, Text, ScrollView } from 'react-native';
import { useAuth, useTeacherTimetable, type Timetable } from '@erp/common';

interface TimetableItemProps {
  timetable: Timetable;
}

function TimetableItem({ timetable }: TimetableItemProps) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekday = weekdays[timetable.weekday - 1];
  
  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-lg font-medium text-gray-900">
            {timetable.subject}
          </Text>
          <Text className="text-sm text-gray-600">
            {timetable.section} • Period {timetable.period_no}
          </Text>
        </View>
        <View className="bg-blue-100 px-3 py-1 rounded">
          <Text className="text-blue-800 font-medium text-sm">{weekday}</Text>
        </View>
      </View>
      
      {(timetable.start_time || timetable.end_time) && (
        <Text className="text-sm text-gray-600">
          {timetable.start_time && timetable.end_time
            ? `${timetable.start_time} - ${timetable.end_time}`
            : timetable.start_time || timetable.end_time}
        </Text>
      )}
    </View>
  );
}

export default function Timetable() {
  const { data: authData } = useAuth();
  const user = authData?.user;
  
  const { data: timetable = [], isLoading } = useTeacherTimetable(user?.id);

  // Group timetable by weekday
  const groupedTimetable = timetable.reduce((acc, item) => {
    if (!acc[item.weekday]) {
      acc[item.weekday] = [];
    }
    acc[item.weekday].push(item);
    return acc;
  }, {} as Record<number, Timetable[]>);

  const weekdays = [
    { day: 1, name: 'Monday' },
    { day: 2, name: 'Tuesday' },
    { day: 3, name: 'Wednesday' },
    { day: 4, name: 'Thursday' },
    { day: 5, name: 'Friday' },
    { day: 6, name: 'Saturday' },
    { day: 7, name: 'Sunday' },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-600">Loading timetable...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-6">My Timetable</Text>

        {timetable.length > 0 ? (
          weekdays.map(({ day, name }) => {
            const dayClasses = groupedTimetable[day] || [];
            
            if (dayClasses.length === 0) return null;
            
            return (
              <View key={day} className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">{name}</Text>
                {dayClasses
                  .sort((a, b) => a.period_no - b.period_no)
                  .map(item => (
                    <TimetableItem key={`${item.id}-${item.period_no}`} timetable={item} />
                  ))}
              </View>
            );
          })
        ) : (
          <View className="bg-white rounded-lg p-8 shadow-sm">
            <Text className="text-center text-gray-600">No timetable data available</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
} 