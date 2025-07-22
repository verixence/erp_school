import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Card } from '../../components/ui/Card';

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

const TeacherTimetableScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(getCurrentDay());
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  const queryClient = useQueryClient();

  function getCurrentDay(): number {
    const today = new Date().getDay();
    return today === 0 ? 6 : today; // Convert Sunday (0) to Saturday (6)
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
                        <Text style={[styles.sectionText, isCurrent && styles.currentPeriodText]}>
                          {period.sections?.grade}{period.sections?.section || period.section}
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

  const renderDayView = () => {
    const dayPeriods = getPeriodsForDay(selectedDay);
    const selectedDayName = WEEKDAYS.find(d => d.id === selectedDay)?.name || '';

    return (
      <View style={styles.dayViewContainer}>
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

        {dayPeriods.length > 0 ? (
          <FlatList
            data={dayPeriods}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
                             const isCurrent = isCurrentPeriod(item);
               return (
                 <Card style={StyleSheet.flatten([styles.periodCard, isCurrent && styles.currentPeriodCard])}>
                  <View style={styles.periodCardHeader}>
                    <View style={styles.periodInfo}>
                      <Text style={[styles.periodCardSubject, isCurrent && styles.currentCardText]}>
                        {item.subject}
                      </Text>
                      <Text style={[styles.periodCardSection, isCurrent && styles.currentCardText]}>
                        Grade {item.sections?.grade}{item.sections?.section || item.section}
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
          />
        ) : (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>No classes scheduled for {selectedDayName}</Text>
          </View>
        )}
      </View>
    );
  };

  const currentPeriod = getCurrentPeriod();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Timetable</Text>
        <Text style={styles.headerSubtitle}>View your teaching schedule</Text>
      </View>

      {/* Current Period Alert */}
      {currentPeriod && (
        <Card style={styles.currentPeriodAlert}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Current Period</Text>
            <Text style={styles.alertSubject}>
              {currentPeriod.subject} - Grade {currentPeriod.sections?.grade}{currentPeriod.sections?.section || currentPeriod.section}
            </Text>
            <Text style={styles.alertTime}>
              {formatTime(currentPeriod.start_time)} - {formatTime(currentPeriod.end_time)}
            </Text>
            {currentPeriod.venue && (
              <Text style={styles.alertVenue}>📍 {currentPeriod.venue}</Text>
            )}
          </View>
        </Card>
      )}

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPeriods}</Text>
          <Text style={styles.statLabel}>Total Periods</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.subjects.length}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.sections.length}</Text>
          <Text style={styles.statLabel}>Sections</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.dailyAverage}</Text>
          <Text style={styles.statLabel}>Daily Average</Text>
        </Card>
      </ScrollView>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'week' && styles.activeToggle]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.toggleText, viewMode === 'week' && styles.activeToggleText]}>
            Week View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'day' && styles.activeToggle]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.toggleText, viewMode === 'day' && styles.activeToggleText]}>
            Day View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timetable Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === 'week' ? renderWeekView() : renderDayView()}
      </ScrollView>
    </SafeAreaView>
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
  currentPeriodAlert: {
    margin: 20,
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
  sectionText: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 2,
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
  periodCardSection: {
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

export default TeacherTimetableScreen; 