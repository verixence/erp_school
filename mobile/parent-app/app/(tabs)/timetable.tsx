import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Chip, Text, Button, Menu, SegmentedButtons } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren, useChildTimetable } from '../../src/hooks/useParentData';

const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export default function TimetableScreen() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);
  const [childMenuVisible, setChildMenuVisible] = useState(false);

  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);

  // Set default selected child when children load
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  const { data: timetable, isLoading: timetableLoading, refetch } = useChildTimetable(selectedChild);

  const currentChild = children?.find(child => child.id === selectedChild);

  // Filter timetable by selected day
  const daySchedule = React.useMemo(() => {
    if (!timetable) return [];
    return timetable
      .filter(period => period.weekday === selectedDay)
      .sort((a, b) => a.period_no - b.period_no);
  }, [timetable, selectedDay]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getSubjectIcon = (subject: string) => {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('math')) return 'calculate';
    if (subjectLower.includes('english') || subjectLower.includes('language')) return 'language';
    if (subjectLower.includes('science')) return 'science';
    if (subjectLower.includes('history')) return 'history-edu';
    if (subjectLower.includes('art')) return 'palette';
    if (subjectLower.includes('music')) return 'music-note';
    if (subjectLower.includes('pe') || subjectLower.includes('physical')) return 'sports';
    if (subjectLower.includes('break') || subjectLower.includes('lunch')) return 'restaurant';
    return 'book';
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Child Selector */}
        {children && children.length > 1 && (
          <Card style={styles.selectorCard}>
            <Card.Content>
              <Text style={styles.selectorLabel}>Select Child</Text>
              <Menu
                visible={childMenuVisible}
                onDismiss={() => setChildMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setChildMenuVisible(true)}
                    icon="person"
                    style={styles.selectorButton}
                  >
                    {currentChild?.full_name || 'Select Child'}
                  </Button>
                }
              >
                {children.map((child) => (
                  <Menu.Item
                    key={child.id}
                    onPress={() => {
                      setSelectedChild(child.id);
                      setChildMenuVisible(false);
                    }}
                    title={`${child.full_name} - Grade ${child.sections?.grade}`}
                  />
                ))}
              </Menu>
            </Card.Content>
          </Card>
        )}

        {/* Current Child Info */}
        {currentChild && (
          <Card style={styles.childCard}>
            <Card.Content>
              <View style={styles.childHeader}>
                <MaterialIcons name="person" size={40} color="#2563eb" />
                <View style={styles.childInfo}>
                  <Title style={styles.childName}>{currentChild.full_name}</Title>
                  <Text style={styles.childGrade}>
                    Grade {currentChild.sections?.grade} - Section {currentChild.sections?.section}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Day Selector */}
        <Card style={styles.dayCard}>
          <Card.Content>
            <Text style={styles.dayLabel}>Select Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.daysContainer}>
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.value}
                    mode={selectedDay === day.value ? 'contained' : 'outlined'}
                    onPress={() => setSelectedDay(day.value)}
                    style={[
                      styles.dayButton,
                      selectedDay === day.value && styles.selectedDayButton
                    ]}
                    contentStyle={styles.dayButtonContent}
                    compact
                  >
                    {day.short}
                  </Button>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Timetable */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>
            {WEEKDAYS.find(d => d.value === selectedDay)?.label} Schedule
          </Title>
          
          {timetableLoading ? (
            <Card style={styles.loadingCard}>
              <Card.Content style={styles.loadingContent}>
                <MaterialIcons name="schedule" size={40} color="#94a3b8" />
                <Text style={styles.loadingText}>Loading timetable...</Text>
              </Card.Content>
            </Card>
          ) : daySchedule.length > 0 ? (
            <View style={styles.scheduleContainer}>
              {daySchedule.map((period) => (
                <Card key={period.id} style={[
                  styles.periodCard,
                  period.is_break && styles.breakCard
                ]}>
                  <Card.Content>
                    <View style={styles.periodHeader}>
                      <View style={styles.periodInfo}>
                        <View style={[
                          styles.subjectIcon,
                          period.is_break && styles.breakIcon
                        ]}>
                          <MaterialIcons
                            name={getSubjectIcon(period.subject) as any}
                            size={24}
                            color={period.is_break ? '#f59e0b' : '#2563eb'}
                          />
                        </View>
                        <View style={styles.periodMeta}>
                          <Title style={styles.subjectTitle}>{period.subject}</Title>
                          {period.teacher && (
                            <Text style={styles.teacherName}>
                              {period.teacher.first_name} {period.teacher.last_name}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.periodDetails}>
                        <Chip style={styles.periodChip}>
                          Period {period.period_no}
                        </Chip>
                      </View>
                    </View>

                    <View style={styles.periodFooter}>
                      {period.start_time && period.end_time && (
                        <View style={styles.timeContainer}>
                          <MaterialIcons name="access-time" size={16} color="#64748b" />
                          <Text style={styles.timeText}>
                            {formatTime(period.start_time)} - {formatTime(period.end_time)}
                          </Text>
                        </View>
                      )}
                      {period.venue && (
                        <View style={styles.venueContainer}>
                          <MaterialIcons name="location-on" size={16} color="#64748b" />
                          <Text style={styles.venueText}>{period.venue}</Text>
                        </View>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialIcons name="event-busy" size={60} color="#94a3b8" />
                <Title style={styles.emptyTitle}>No Classes Scheduled</Title>
                <Paragraph style={styles.emptyText}>
                  No classes are scheduled for{' '}
                  {WEEKDAYS.find(d => d.value === selectedDay)?.label}.
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Weekly Overview */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Weekly Overview</Title>
          <View style={styles.weeklyGrid}>
            {WEEKDAYS.map((day) => {
              const dayPeriods = timetable?.filter(p => p.weekday === day.value && !p.is_break) || [];
              return (
                <Card
                  key={day.value}
                  style={[
                    styles.weeklyCard,
                    selectedDay === day.value && styles.selectedWeeklyCard
                  ]}
                  onPress={() => setSelectedDay(day.value)}
                >
                  <Card.Content style={styles.weeklyContent}>
                    <Text style={styles.weeklyDay}>{day.short}</Text>
                    <Text style={styles.weeklyCount}>{dayPeriods.length}</Text>
                    <Text style={styles.weeklyLabel}>Classes</Text>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        </View>

        {/* No Children State */}
        {!childrenLoading && (!children || children.length === 0) && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialIcons name="people-outline" size={60} color="#94a3b8" />
              <Title style={styles.emptyTitle}>No Children Found</Title>
              <Paragraph style={styles.emptyText}>
                No children are currently linked to your account.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  selectorCard: {
    elevation: 2,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  selectorButton: {
    borderColor: '#2563eb',
  },
  childCard: {
    elevation: 2,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  childGrade: {
    fontSize: 14,
    color: '#64748b',
  },
  dayCard: {
    elevation: 2,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    minWidth: 60,
  },
  selectedDayButton: {
    backgroundColor: '#2563eb',
  },
  dayButtonContent: {
    paddingHorizontal: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  scheduleContainer: {
    gap: 8,
  },
  periodCard: {
    elevation: 2,
  },
  breakCard: {
    backgroundColor: '#fef3c7',
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakIcon: {
    backgroundColor: '#fef3c7',
  },
  periodMeta: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  teacherName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  periodDetails: {
    alignItems: 'flex-end',
  },
  periodChip: {
    backgroundColor: '#e2e8f0',
  },
  periodFooter: {
    gap: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  venueText: {
    fontSize: 12,
    color: '#64748b',
  },
  weeklyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weeklyCard: {
    flex: 1,
    minWidth: '13%',
    elevation: 1,
  },
  selectedWeeklyCard: {
    backgroundColor: '#eff6ff',
    elevation: 3,
  },
  weeklyContent: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  weeklyDay: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  weeklyCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  weeklyLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  loadingCard: {
    elevation: 1,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyCard: {
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#64748b',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
  },
}); 