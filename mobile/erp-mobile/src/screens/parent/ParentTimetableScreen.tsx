import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Calendar, Clock, User, Book } from 'lucide-react-native';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  sections: {
    id: string;
    grade: number;
    section: string;
  };
}

interface Period {
  id: string;
  weekday: number;
  period_no: number;
  subject: string;
  start_time: string;
  end_time: string;
  venue: string;
  users: {
    first_name: string;
    last_name: string;
  };
}

const WEEKDAYS = [
  { id: 1, name: 'Monday', short: 'MON' },
  { id: 2, name: 'Tuesday', short: 'TUE' },
  { id: 3, name: 'Wednesday', short: 'WED' },
  { id: 4, name: 'Thursday', short: 'THU' },
  { id: 5, name: 'Friday', short: 'FRI' },
  { id: 6, name: 'Saturday', short: 'SAT' },
];

const getCurrentDay = (): number => {
  const today = new Date().getDay();
  return today === 0 ? 6 : today; // Convert Sunday (0) to Saturday (6)
};

const ParentTimetableScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(getCurrentDay());
  const [refreshing, setRefreshing] = useState(false);

  // Fetch children
  const { data: children = [], isLoading: childrenLoading, refetch: refetchChildren } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            admission_no,
            section_id,
            sections!inner(
              id,
              grade,
              section
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('students.school_id', user.school_id);

      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        sections: item.students.sections
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Auto-select first child
  React.useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch timetable
  const { data: periods = [] } = useQuery({
    queryKey: ['child-timetable', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];

      const child = children.find(c => c.id === selectedChild);
      if (!child) return [];

      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          teacher:users!periods_teacher_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('section_id', child.sections?.id)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      if (error) {
        console.error('Timetable fetch error:', error);
        throw error;
      }

      return (data || []).map((period: any) => ({
        ...period,
        users: period.teacher ? {
          first_name: period.teacher.first_name,
          last_name: period.teacher.last_name
        } : null
      })) as Period[];
    },
    enabled: !!selectedChild && children.length > 0
  });

  const currentChild = children.find(c => c.id === selectedChild);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchChildren();
    setRefreshing(false);
  };

  // Get periods for selected day
  const todaysPeriods = periods
    .filter(p => p.weekday === selectedDay)
    .sort((a, b) => a.period_no - b.period_no);

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hour), parseInt(minute));
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isCurrentPeriod = (period: Period) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = getCurrentDay();

    return period.weekday === currentDay &&
           period.start_time <= currentTime &&
           period.end_time >= currentTime;
  };

  if (childrenLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading timetable...</Text>
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
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            backgroundColor: '#8b5cf6',
            padding: 10,
            borderRadius: 12,
            marginRight: 12
          }}>
            <Calendar size={24} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
              Class Timetable
            </Text>
            {currentChild && (
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                {currentChild.full_name} - Grade {currentChild.sections.grade} {currentChild.sections.section}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Child Selector (if multiple children) */}
      {children.length > 1 && (
        <View style={{
          backgroundColor: 'white',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb'
        }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
            Select Child:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={{
                  marginRight: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: selectedChild === child.id ? '#8b5cf6' : '#f3f4f6',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectedChild === child.id ? '#8b5cf6' : '#e5e7eb',
                }}
                onPress={() => setSelectedChild(child.id)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selectedChild === child.id ? 'white' : '#6b7280'
                }}>
                  {child.full_name}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: selectedChild === child.id ? 'rgba(255,255,255,0.8)' : '#9ca3af',
                  marginTop: 2
                }}>
                  Grade {child.sections.grade} {child.sections.section}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Day Selector */}
      <View style={{ backgroundColor: 'white', paddingVertical: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          {WEEKDAYS.map(day => (
            <TouchableOpacity
              key={day.id}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                marginRight: 8,
                backgroundColor: selectedDay === day.id ? '#8b5cf6' : '#f3f4f6',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: selectedDay === day.id ? '#8b5cf6' : '#e5e7eb',
              }}
              onPress={() => setSelectedDay(day.id)}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: selectedDay === day.id ? 'white' : '#6b7280',
              }}>
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Periods List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!currentChild ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <Calendar size={48} color="#6b7280" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              No Child Selected
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              Please select a child to view their timetable.
            </Text>
          </Card>
        ) : todaysPeriods.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <Calendar size={48} color="#6b7280" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              No Classes Today
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              No classes scheduled for {WEEKDAYS.find(d => d.id === selectedDay)?.name}.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 16 }}>
            {todaysPeriods.map((period) => {
              const isCurrent = isCurrentPeriod(period);
              return (
                <Card
                  key={period.id}
                  style={{
                    padding: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: isCurrent ? '#8b5cf6' : '#e5e7eb',
                    backgroundColor: isCurrent ? '#f5f3ff' : 'white'
                  }}
                >
                  {isCurrent && (
                    <View style={{
                      backgroundColor: '#8b5cf6',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                      alignSelf: 'flex-start',
                      marginBottom: 12
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: 'white' }}>
                        CURRENT PERIOD
                      </Text>
                    </View>
                  )}

                  {/* Period Number */}
                  <View style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    backgroundColor: isCurrent ? '#8b5cf6' : '#f3f4f6',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isCurrent ? 'white' : '#6b7280'
                    }}>
                      P{period.period_no}
                    </Text>
                  </View>

                  {/* Subject */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                      backgroundColor: isCurrent ? '#8b5cf6' : '#8b5cf6',
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      opacity: isCurrent ? 1 : 0.7
                    }}>
                      <Book size={20} color="white" />
                    </View>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#111827',
                      flex: 1,
                      marginRight: 50
                    }}>
                      {period.subject}
                    </Text>
                  </View>

                  {/* Teacher */}
                  {period.users && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <User size={16} color="#6b7280" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>
                        {period.users.first_name} {period.users.last_name}
                      </Text>
                    </View>
                  )}

                  {/* Time */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Clock size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                      {formatTime(period.start_time)} - {formatTime(period.end_time)}
                    </Text>
                  </View>

                  {/* Venue */}
                  {period.venue && (
                    <View style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#f3f4f6'
                    }}>
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>
                        📍 {period.venue}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export { ParentTimetableScreen };
export default ParentTimetableScreen;
