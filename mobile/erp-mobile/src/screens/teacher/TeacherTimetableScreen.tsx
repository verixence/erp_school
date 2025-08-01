import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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

const { width, height } = Dimensions.get('window');

interface Period {
  id: string;
  weekday: number;
  period_no: number;
  subject: string;
  section: string;
  start_time: string;
  end_time: string;
  venue: string;
  sections: {
    grade: number;
    section: string;
  };
}

interface TimetableStats {
  totalPeriods: number;
  subjects: string[];
  sections: string[];
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
  default: '#6C5CE7'
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

const TeacherTimetableScreen: React.FC = () => {
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
    return today === 0 ? 6 : today;
  }

  // Fetch teacher's timetable
  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['teacher-timetable'],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          sections(grade, section)
        `)
        .eq('teacher_id', profile.user.id)
        .order('weekday', { ascending: true })
        .order('period_no', { ascending: true });

      if (error) throw error;
      return data as Period[];
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['teacher-timetable'] });
    setRefreshing(false);
  };

  // Calculate stats
  const getStats = (): TimetableStats => {
    const subjects = [...new Set(periods.map(p => p.subject))];
    const sections = [...new Set(periods.map(p => `${p.sections?.grade}${p.sections?.section || p.section}`))];
    const dailyAverage = periods.length / WEEKDAYS.length;

    return {
      totalPeriods: periods.length,
      subjects,
      sections,
      dailyAverage: Math.round(dailyAverage * 10) / 10
    };
  };

  const stats = getStats();

  // Get periods for a specific day
  const getPeriodsForDay = (dayId: number) => {
    return periods
      .filter(p => p.weekday === dayId)
      .sort((a, b) => a.period_no - b.period_no);
  };

  // Get current period
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
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

  const renderWeekView = () => {
    const maxPeriods = Math.max(...WEEKDAYS.map(day => getPeriodsForDay(day.id).length), 6);
    const periodNumbers = Array.from({ length: maxPeriods }, (_, i) => i + 1);

    return (
      <View style={{ flex: 1 }}>
        {/* Week Navigation - Compact */}
        <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
            <TouchableOpacity 
              onPress={() => navigateWeek('prev')}
              style={{ padding: 4 }}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color="#6C5CE7" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flex: 1, alignItems: 'center' }}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2D3748' }}>
                Week of {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 12, color: '#718096' }}>
                {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => navigateWeek('next')}
              style={{ padding: 4 }}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color="#6C5CE7" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Timetable Grid */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <View style={{ minWidth: width * 1.2 }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <View style={{ width: 58, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#718096" />
              </View>
              {WEEKDAYS.map((day, index) => {
                const dayDate = weekDates[index];
                const todayFlag = isToday(dayDate);
                
                return (
                  <View 
                    key={day.id} 
                    style={{ 
                      width: 88, 
                      height: 44, 
                      marginRight: 3,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: todayFlag ? '#6C5CE7' : '#F7FAFC',
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ 
                      fontSize: 11, 
                      fontWeight: 'bold', 
                      color: todayFlag ? 'white' : '#2D3748'
                    }}>
                      {day.short}
                    </Text>
                    <Text style={{ 
                      fontSize: 9, 
                      color: todayFlag ? 'rgba(255,255,255,0.8)' : '#718096'
                    }}>
                      {dayDate.getDate()}
                    </Text>
                    {todayFlag && (
                      <View style={{ 
                        width: 6, 
                        height: 6, 
                        borderRadius: 3, 
                        backgroundColor: '#FFF', 
                        marginTop: 1 
                      }} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Period rows */}
            {periodNumbers.map(periodNo => (
              <View key={periodNo} style={{ flexDirection: 'row', marginBottom: 6 }}>
                <View style={{ 
                  width: 58, 
                  height: 76, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: '#EDF2F7',
                  borderRadius: 8,
                  marginRight: 3
                }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4A5568' }}>
                    P{periodNo}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#718096', textAlign: 'center' }}>
                    {getPeriodTime(periodNo).split(' - ')[0]}
                  </Text>
                </View>
                
                {WEEKDAYS.map(day => {
                  const dayPeriods = getPeriodsForDay(day.id);
                  const period = dayPeriods.find(p => p.period_no === periodNo);
                  const isCurrent = period && isCurrentPeriod(period);
                  const subjectColor = period ? getSubjectColor(period.subject) : '#E2E8F0';

                  return (
                    <TouchableOpacity
                      key={`${day.id}-${periodNo}`}
                      style={{
                        width: 88,
                        height: 76,
                        marginRight: 3,
                        borderRadius: 12,
                        padding: 6,
                        backgroundColor: period ? `${subjectColor}15` : '#F8FAFC',
                        borderWidth: 2,
                        borderColor: isCurrent ? subjectColor : (period ? `${subjectColor}30` : '#E2E8F0'),
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        if (period) {
                          setSelectedPeriod(period);
                          setShowPeriodModal(true);
                        }
                      }}
                    >
                      {period ? (
                        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                          <Text style={{ 
                            fontSize: 10, 
                            fontWeight: 'bold', 
                            color: subjectColor,
                            textAlign: 'center',
                            marginBottom: 2
                          }}>
                            {period.subject.length > 8 ? `${period.subject.substring(0, 8)}...` : period.subject}
                          </Text>
                          <Text style={{ 
                            fontSize: 8, 
                            color: '#718096',
                            textAlign: 'center'
                          }}>
                            {period.sections?.grade}{period.sections?.section || period.section}
                          </Text>
                          {isCurrent && (
                            <View style={{ 
                              backgroundColor: subjectColor,
                              borderRadius: 6,
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                              marginTop: 2
                            }}>
                              <Text style={{ fontSize: 6, color: 'white', fontWeight: 'bold' }}>
                                LIVE
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                          Free
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderDayView = () => {
    const dayPeriods = getPeriodsForDay(selectedDay);
    const selectedDayName = WEEKDAYS.find(d => d.id === selectedDay)?.name || '';

    return (
      <View style={{ flex: 1 }}>
        {/* Day selector - Compact */}
        <View style={{ 
          flexDirection: 'row', 
          paddingHorizontal: 16, 
          marginBottom: 12,
          justifyContent: 'space-between'
        }}>
          {WEEKDAYS.map((day, index) => {
            const dayDate = weekDates[index];
            const isSelected = selectedDay === day.id;
            const todayFlag = isToday(dayDate);
            
            return (
              <TouchableOpacity
                key={day.id}
                onPress={() => setSelectedDay(day.id)}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: isSelected ? '#6C5CE7' : (todayFlag ? '#EDF2F7' : '#F8FAFC'),
                  borderWidth: todayFlag && !isSelected ? 1.5 : 0,
                  borderColor: '#6C5CE7',
                  flex: 1,
                  marginHorizontal: 2,
                  alignItems: 'center',
                  minHeight: 50
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isSelected ? 'white' : (todayFlag ? '#6C5CE7' : '#4A5568'),
                  marginBottom: 2
                }}>
                  {day.short}
                </Text>
                <Text style={{
                  fontSize: 11,
                  color: isSelected ? 'rgba(255,255,255,0.8)' : '#718096'
                }}>
                  {dayDate.getDate()}
                </Text>
                {todayFlag && !isSelected && (
                  <View style={{ 
                    width: 4, 
                    height: 4, 
                    borderRadius: 2, 
                    backgroundColor: '#6C5CE7', 
                    marginTop: 2 
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ 
          fontSize: 20, 
          fontWeight: 'bold', 
          color: '#2D3748',
          marginHorizontal: 16,
          marginBottom: 12
        }}>
          {selectedDayName} Schedule
        </Text>

        {dayPeriods.length > 0 ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {dayPeriods.map((item) => {
              const isCurrent = isCurrentPeriod(item);
              const subjectColor = getSubjectColor(item.subject);
              
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectedPeriod(item);
                    setShowPeriodModal(true);
                  }}
                >
                  <Card style={{ 
                    marginBottom: 12,
                    backgroundColor: isCurrent ? `${subjectColor}10` : 'white',
                    borderLeftWidth: 4,
                    borderLeftColor: subjectColor,
                  }}>
                    <View style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ 
                            fontSize: 20, 
                            fontWeight: 'bold', 
                            color: '#2D3748',
                            marginBottom: 4
                          }}>
                            {item.subject}
                          </Text>
                          <Text style={{ 
                            fontSize: 16, 
                            color: '#718096',
                            marginBottom: 4
                          }}>
                            Grade {item.sections?.grade}{item.sections?.section || item.section}
                          </Text>
                        </View>
                        
                        <View style={{ alignItems: 'flex-end' }}>
                          <Chip 
                            style={{ backgroundColor: `${subjectColor}20` }}
                            textStyle={{ color: subjectColor, fontSize: 12, fontWeight: 'bold' }}
                          >
                            Period {item.period_no}
                          </Chip>
                          {isCurrent && (
                            <Badge style={{ backgroundColor: subjectColor, marginTop: 8 }}>
                              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                CURRENT
                              </Text>
                            </Badge>
                          )}
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#718096" />
                        <Text style={{ fontSize: 14, color: '#4A5568', marginLeft: 8, fontWeight: '500' }}>
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </Text>
                      </View>
                      
                      {item.venue && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#718096" />
                          <Text style={{ fontSize: 14, color: '#4A5568', marginLeft: 8 }}>
                            {item.venue}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <MaterialCommunityIcons name="calendar-remove" size={64} color="#CBD5E0" />
            <Text style={{ 
              fontSize: 18, 
              color: '#4A5568',
              textAlign: 'center',
              marginTop: 16,
              fontWeight: '500'
            }}>
              No classes scheduled
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: '#718096',
              textAlign: 'center',
              marginTop: 4
            }}>
              Enjoy your free day!
            </Text>
          </View>
        )}
      </View>
    );
  };

  const currentPeriod = getCurrentPeriod();

  return (
    <PaperProvider>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Header - Compact */}
        <LinearGradient
          colors={['#6C5CE7', '#A29BFE']}
          style={{ paddingHorizontal: 20, paddingVertical: 16 }}
        >
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: 'white',
            marginBottom: 4
          }}>
            My Timetable
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.8)'
          }}>
            Your teaching schedule at a glance
          </Text>
        </LinearGradient>

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
                {currentPeriod.subject} - Grade {currentPeriod.sections?.grade}{currentPeriod.sections?.section || currentPeriod.section}
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
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#6C5CE7' }}>
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
              {stats.sections.length}
            </Text>
            <Text style={{ fontSize: 11, color: '#718096', textAlign: 'center' }}>
              Sections
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
              backgroundColor: viewMode === 'week' ? '#6C5CE7' : 'transparent'
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
              backgroundColor: viewMode === 'day' ? '#6C5CE7' : 'transparent'
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
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={{ marginTop: 16, color: '#718096' }}>Loading timetable...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {viewMode === 'week' ? renderWeekView() : renderDayView()}
          </ScrollView>
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
                    Grade {selectedPeriod.sections?.grade}{selectedPeriod.sections?.section || selectedPeriod.section}
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

export default TeacherTimetableScreen;