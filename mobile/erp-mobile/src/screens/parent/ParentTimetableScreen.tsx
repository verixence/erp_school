import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  Button, 
  Chip, 
  Portal, 
  Modal as PaperModal,
  Provider as PaperProvider,
  Surface,
  Divider,
  ActivityIndicator,
  Badge,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

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
  sections?: {
    grade: number;
    section: string;
  };
}

interface TimetableStats {
  totalPeriods: number;
  subjects: string[];
  teachers: string[];
  dailyAverage: number;
}

const WEEKDAYS = [
  { id: 1, name: 'Monday', short: 'MON' },
  { id: 2, name: 'Tuesday', short: 'TUE' },
  { id: 3, name: 'Wednesday', short: 'WED' },
  { id: 4, name: 'Thursday', short: 'THU' },
  { id: 5, name: 'Friday', short: 'FRI' },
  { id: 6, name: 'Saturday', short: 'SAT' },
];

const SUBJECT_COLORS = {
  Mathematics: '#FF6B6B',
  English: '#4ECDC4',
  Science: '#45B7D1',
  Physics: '#96CEB4',
  Chemistry: '#FFEAA7',
  Biology: '#DDA0DD',
  History: '#F4A261',
  Geography: '#2A9D8F',
  Hindi: '#E76F51',
  default: '#8b5cf6'
};

const PERIOD_TIMES = [
  { period: 1, start: '09:00', end: '09:45' },
  { period: 2, start: '09:45', end: '10:30' },
  { period: 3, start: '10:50', end: '11:35' },
  { period: 4, start: '11:35', end: '12:20' },
  { period: 5, start: '13:00', end: '13:45' },
  { period: 6, start: '13:45', end: '14:30' },
  { period: 7, start: '14:30', end: '15:15' },
  { period: 8, start: '15:15', end: '16:00' },
];

const ParentTimetableScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(getCurrentDay());
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const queryClient = useQueryClient();

  function getCurrentDay(): number {
    const today = new Date().getDay();
    return today === 0 ? 6 : today; // Convert Sunday (0) to Saturday (6)
  }

  // Fetch children using the correct student_parents table relationship
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
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Auto-select first child
  React.useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch timetable for selected child
  const { data: periods = [], isLoading: periodsLoading, error: periodsError } = useQuery({
    queryKey: ['child-timetable', selectedChild],
    queryFn: async () => {
      if (!selectedChild) {
        console.log('No selected child');
        return [];
      }

      const child = children.find(c => c.id === selectedChild);
      if (!child) {
        console.log('Child not found:', selectedChild);
        return [];
      }

      console.log('Fetching timetable for child:', child.full_name, 'Section ID:', child.sections?.id);

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
      
      console.log('Periods data:', data?.length || 0, 'periods found');
      
      // Transform data to match expected format (same as web app)
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
    await Promise.all([
      refetchChildren(),
    ]);
    setRefreshing(false);
  };

  // Get periods for a specific day
  const getPeriodsForDay = (dayId: number) => {
    return periods
      .filter(p => p.weekday === dayId)
      .sort((a, b) => a.period_no - b.period_no);
  };

  // Get current period
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = getCurrentDay();

    return periods.find(p => 
      p.weekday === currentDay &&
      p.start_time <= currentTime &&
      p.end_time >= currentTime
    );
  };

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

  const getSubjectColor = (subject: string) => {
    return SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS.default;
  };

  const getPeriodTime = (periodNo: number) => {
    const periodTime = PERIOD_TIMES.find(p => p.period === periodNo);
    return periodTime ? `${periodTime.start} - ${periodTime.end}` : '';
  };

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    return WEEKDAYS.map((_, index) => {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + index);
      return weekDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDates = useMemo(() => getWeekDates(selectedWeek), [selectedWeek]);

  const renderChildSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Select Child:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[styles.childChip, selectedChild === child.id && styles.childChipActive]}
            onPress={() => setSelectedChild(child.id)}
          >
            <Text style={[styles.childChipText, selectedChild === child.id && styles.childChipTextActive]}>
              {child.full_name}
            </Text>
            <Text style={[styles.childChipSubtext, selectedChild === child.id && styles.childChipSubtextActive]}>
              Grade {child.sections.grade}{child.sections.section}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderWeekView = () => {
    const maxPeriods = Math.max(...WEEKDAYS.map(day => getPeriodsForDay(day.id).length));
    const periodNumbers = Array.from({ length: maxPeriods }, (_, i) => i + 1);

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.weekContainer}>
          {/* Header row */}
          <View style={styles.weekHeader}>
            <View style={styles.timeSlotHeader} />
            {WEEKDAYS.map(day => (
              <View key={day.id} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day.short}</Text>
              </View>
            ))}
          </View>

          {/* Period rows */}
          {periodNumbers.map(periodNo => (
            <View key={periodNo} style={styles.periodRow}>
              <View style={styles.timeSlot}>
                <Text style={styles.periodNumber}>P{periodNo}</Text>
              </View>
              {WEEKDAYS.map(day => {
                const dayPeriods = getPeriodsForDay(day.id);
                const period = dayPeriods.find(p => p.period_no === periodNo);
                const isCurrent = period && isCurrentPeriod(period);

                return (
                  <TouchableOpacity
                    key={`${day.id}-${periodNo}`}
                    style={[
                      styles.periodCell,
                      period && styles.periodCellFilled,
                      isCurrent && styles.currentPeriodCell
                    ]}
                    onPress={() => {
                      if (period) {
                        setSelectedDay(day.id);
                        setViewMode('day');
                      }
                    }}
                  >
                    {period ? (
                      <View style={styles.periodContent}>
                        <Text style={[styles.subjectText, isCurrent && styles.currentPeriodText]}>
                          {period.subject}
                        </Text>
                        <Text style={[styles.teacherText, isCurrent && styles.currentPeriodText]}>
                          {period.users?.first_name} {period.users?.last_name}
                        </Text>
                        <Text style={[styles.timeText, isCurrent && styles.currentPeriodText]}>
                          {formatTime(period.start_time)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.freePeriodText}>Free</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderDayViewHeader = () => {
    const selectedDayName = WEEKDAYS.find(d => d.id === selectedDay)?.name || '';
    
    return (
      <View>
        {/* Day selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
          {WEEKDAYS.map(day => (
            <TouchableOpacity
              key={day.id}
              style={[styles.daySelectorItem, selectedDay === day.id && styles.selectedDayItem]}
              onPress={() => setSelectedDay(day.id)}
            >
              <Text style={[styles.daySelectorText, selectedDay === day.id && styles.selectedDayText]}>
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.dayTitle}>{selectedDayName} Schedule</Text>
      </View>
    );
  };

  const renderDayView = () => {
    const dayPeriods = getPeriodsForDay(selectedDay);
    const selectedDayName = WEEKDAYS.find(d => d.id === selectedDay)?.name || '';

    if (dayPeriods.length === 0) {
      return (
        <View style={styles.dayViewContainer}>
          {renderDayViewHeader()}
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>No classes scheduled for {selectedDayName}</Text>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        style={styles.dayViewContainer}
        data={dayPeriods}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderDayViewHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const isCurrent = isCurrentPeriod(item);
          return (
            <Card style={StyleSheet.flatten([styles.periodCard, isCurrent && styles.currentPeriodCard])}>
              <View style={styles.periodCardHeader}>
                <View style={styles.periodInfo}>
                  <Text style={[styles.periodCardSubject, isCurrent && styles.currentCardText]}>
                    {item.subject}
                  </Text>
                  <Text style={[styles.periodCardTeacher, isCurrent && styles.currentCardText]}>
                    {item.users?.first_name} {item.users?.last_name}
                  </Text>
                </View>
                <View style={styles.periodTime}>
                  <Text style={[styles.periodTimeText, isCurrent && styles.currentCardText]}>
                    Period {item.period_no}
                  </Text>
                  <Text style={[styles.periodDuration, isCurrent && styles.currentCardText]}>
                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                  </Text>
                </View>
              </View>
              
              {item.venue && (
                <View style={styles.venueContainer}>
                  <Text style={[styles.venueText, isCurrent && styles.currentCardText]}>
                    📍 {item.venue}
                  </Text>
                </View>
              )}

              {isCurrent && (
                <View style={styles.currentIndicator}>
                  <Text style={styles.currentIndicatorText}>CURRENT PERIOD</Text>
                </View>
              )}
            </Card>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  };

  const currentPeriod = getCurrentPeriod();

  // Calculate stats
  const getStats = (): TimetableStats => {
    const subjects = [...new Set(periods.map(p => p.subject))];
    const teachers = [...new Set(periods.map(p => `${p.users?.first_name} ${p.users?.last_name}`))];
    const dailyAverage = periods.length / WEEKDAYS.length;

    return {
      totalPeriods: periods.length,
      subjects,
      teachers,
      dailyAverage: Math.round(dailyAverage * 10) / 10
    };
  };

  const stats = getStats();

  return (
    <PaperProvider>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Enhanced Header with Gradient */}
        <LinearGradient
          colors={['#8b5cf6', '#a855f7']}
          style={{ paddingHorizontal: 20, paddingVertical: 16 }}
        >
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: 'white',
            marginBottom: 4
          }}>
            Class Timetable
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.8)'
          }}>
            Your child's class schedule at a glance
          </Text>
        </LinearGradient>

        {/* Child Selector - Enhanced */}
        {children.length > 1 && (
          <View style={{ 
            backgroundColor: 'rgba(139,92,246,0.1)', 
            marginHorizontal: 20, 
            marginTop: 16,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(139,92,246,0.2)',
          }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500', 
              color: '#8b5cf6', 
              marginBottom: 8 
            }}>
              Select Child
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={{
                    marginRight: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: selectedChild === child.id ? '#8b5cf6' : 'rgba(139,92,246,0.1)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: selectedChild === child.id ? '#8b5cf6' : 'rgba(139,92,246,0.3)',
                  }}
                  onPress={() => setSelectedChild(child.id)}
                >
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: selectedChild === child.id ? 'white' : '#8b5cf6'
                  }}>
                    {child.full_name}
                  </Text>
                  <Text style={{ 
                    fontSize: 12, 
                    color: selectedChild === child.id ? 'rgba(255,255,255,0.8)' : 'rgba(139,92,246,0.7)', 
                    marginTop: 2 
                  }}>
                    Grade {child.sections.grade}{child.sections.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Current Period Alert */}
        {currentPeriod && (
          <Card style={{ 
            marginHorizontal: 16, 
            marginTop: 12,
            marginBottom: 8,
            backgroundColor: getSubjectColor(currentPeriod.subject),
            elevation: 8
          }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="play-circle" size={24} color="white" />
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: 'bold', 
                  color: 'white',
                  marginLeft: 8
                }}>
                  Current Period
                </Text>
              </View>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: 'white',
                marginBottom: 4
              }}>
                {currentPeriod.subject} - Grade {currentPeriod.sections?.grade}{currentPeriod.sections?.section}
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: 4
              }}>
                Teacher: {currentPeriod.users?.first_name} {currentPeriod.users?.last_name}
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: 4
              }}>
                {formatTime(currentPeriod.start_time)} - {formatTime(currentPeriod.end_time)}
              </Text>
              {currentPeriod.venue && (
                <Text style={{ 
                  fontSize: 14, 
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  📍 {currentPeriod.venue}
                </Text>
              )}
            </View>
          </Card>
        )}

        {/* Stats Cards - 2x2 Grid */}
        <View style={{ 
          paddingHorizontal: 16, 
          marginBottom: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          <Card style={{ 
            width: (width - 48) / 2, 
            marginBottom: 8, 
            alignItems: 'center', 
            paddingVertical: 12,
            height: 90
          }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#8b5cf6' }}>
              {stats.totalPeriods}
            </Text>
            <Text style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>
              Total Periods
            </Text>
          </Card>
          <Card style={{ 
            width: (width - 48) / 2, 
            marginBottom: 8, 
            alignItems: 'center', 
            paddingVertical: 12,
            height: 90
          }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#48BB78' }}>
              {stats.subjects.length}
            </Text>
            <Text style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>
              Subjects
            </Text>
          </Card>
          <Card style={{ 
            width: (width - 48) / 2, 
            alignItems: 'center', 
            paddingVertical: 12,
            height: 90
          }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ED8936' }}>
              {stats.teachers.length}
            </Text>
            <Text style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>
              Teachers
            </Text>
          </Card>
          <Card style={{ 
            width: (width - 48) / 2, 
            alignItems: 'center', 
            paddingVertical: 12,
            height: 90
          }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#38B2AC' }}>
              {stats.dailyAverage}
            </Text>
            <Text style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>
              Daily Average
            </Text>
          </Card>
        </View>

        {/* View Mode Toggle */}
        <View style={{ 
          flexDirection: 'row', 
          marginHorizontal: 16, 
          marginBottom: 12,
          backgroundColor: '#EDF2F7',
          borderRadius: 12,
          padding: 3
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: viewMode === 'week' ? '#8b5cf6' : 'transparent'
            }}
            onPress={() => setViewMode('week')}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: viewMode === 'week' ? 'white' : '#4A5568'
            }}>
              Week View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: viewMode === 'day' ? '#8b5cf6' : 'transparent'
            }}
            onPress={() => setViewMode('day')}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: viewMode === 'day' ? 'white' : '#4A5568'
            }}>
              Day View
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timetable Content */}
        {childrenLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={{ marginTop: 16, color: '#718096' }}>Loading timetable...</Text>
          </View>
        ) : viewMode === 'week' ? (
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderWeekView()}
          </ScrollView>
        ) : (
          renderDayView()
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedWeek}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setSelectedWeek(selectedDate);
              }
            }}
          />
        )}

        {/* Period Details Modal */}
        <Portal>
          <PaperModal
            visible={showPeriodModal}
            onDismiss={() => setShowPeriodModal(false)}
            contentContainerStyle={{
              backgroundColor: 'white',
              margin: 20,
              borderRadius: 20,
              padding: 0,
              maxHeight: height * 0.6
            }}
          >
            {selectedPeriod && (
              <View>
                <LinearGradient
                  colors={[getSubjectColor(selectedPeriod.subject), `${getSubjectColor(selectedPeriod.subject)}CC`]}
                  style={{ padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
                >
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: 'bold', 
                    color: 'white',
                    marginBottom: 8
                  }}>
                    {selectedPeriod.subject}
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    Grade {selectedPeriod.sections?.grade}{selectedPeriod.sections?.section}
                  </Text>
                </LinearGradient>
                
                <View style={{ padding: 20 }}>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#718096', marginBottom: 4 }}>Period</Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D3748' }}>
                      Period {selectedPeriod.period_no}
                    </Text>
                  </View>
                  
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#718096', marginBottom: 4 }}>Time</Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D3748' }}>
                      {formatTime(selectedPeriod.start_time)} - {formatTime(selectedPeriod.end_time)}
                    </Text>
                  </View>
                  
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#718096', marginBottom: 4 }}>Teacher</Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D3748' }}>
                      {selectedPeriod.users?.first_name} {selectedPeriod.users?.last_name}
                    </Text>
                  </View>
                  
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#718096', marginBottom: 4 }}>Day</Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D3748' }}>
                      {WEEKDAYS.find(d => d.id === selectedPeriod.weekday)?.name}
                    </Text>
                  </View>
                  
                  {selectedPeriod.venue && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 14, color: '#718096', marginBottom: 4 }}>Venue</Text>
                      <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D3748' }}>
                        {selectedPeriod.venue}
                      </Text>
                    </View>
                  )}
                  
                  <Button
                    mode="contained"
                    onPress={() => setShowPeriodModal(false)}
                    style={{ 
                      backgroundColor: getSubjectColor(selectedPeriod.subject),
                      borderRadius: 12
                    }}
                  >
                    Close
                  </Button>
                </View>
              </View>
            )}
          </PaperModal>
        </Portal>
        </SafeAreaView>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  selectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  childChip: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  childChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  childChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  childChipTextActive: {
    color: '#FFFFFF',
  },
  childChipSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  childChipSubtextActive: {
    color: '#E5E7EB',
  },
  childInfoCard: {
    margin: 20,
    paddingVertical: 16,
  },
  childInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  childInfoDetails: {
    fontSize: 14,
    color: '#64748B',
  },
  currentPeriodAlert: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  alertContent: {
    padding: 16,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.9,
  },
  alertSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertTeacher: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.9,
  },
  alertTime: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.9,
  },
  alertVenue: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#3B82F6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  weekContainer: {
    paddingHorizontal: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timeSlotHeader: {
    width: 50,
    height: 40,
  },
  dayHeader: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timeSlot: {
    width: 50,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  periodCell: {
    width: 80,
    height: 80,
    marginRight: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodCellFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B82F6',
  },
  currentPeriodCell: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  periodContent: {
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 2,
  },
  teacherText: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 2,
    textAlign: 'center',
  },
  timeText: {
    fontSize: 8,
    color: '#64748B',
  },
  currentPeriodText: {
    color: '#FFFFFF',
  },
  freePeriodText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  dayViewContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  daySelector: {
    marginBottom: 16,
  },
  daySelectorItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDayItem: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  daySelectorText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  periodCard: {
    marginBottom: 12,
  },
  currentPeriodCard: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  periodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  periodInfo: {
    flex: 1,
  },
  periodCardSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  periodCardTeacher: {
    fontSize: 14,
    color: '#64748B',
  },
  periodTime: {
    alignItems: 'flex-end',
  },
  periodTimeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  periodDuration: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  currentCardText: {
    color: '#1E293B',
  },
  venueContainer: {
    marginTop: 8,
  },
  venueText: {
    fontSize: 14,
    color: '#64748B',
  },
  currentIndicator: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  currentIndicatorText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDayText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
});

export { ParentTimetableScreen };
