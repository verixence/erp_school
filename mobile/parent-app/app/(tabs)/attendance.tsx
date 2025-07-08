import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Chip, Surface, Text, SegmentedButtons, Menu, Divider, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren, useChildAttendance } from '../../src/hooks/useParentData';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [childMenuVisible, setChildMenuVisible] = useState(false);

  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);

  // Set default selected child when children load
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'quarter':
        return {
          start: format(subDays(today, 90), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
    }
  };

  const { start, end } = getDateRange();
  const { data: attendance, isLoading: attendanceLoading, refetch } = useChildAttendance(
    selectedChild,
    start,
    end
  );

  const currentChild = children?.find(child => child.id === selectedChild);

  // Calculate attendance stats
  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter(record => record.status === 'present').length || 0;
  const absentDays = attendance?.filter(record => record.status === 'absent').length || 0;
  const lateDays = attendance?.filter(record => record.status === 'late').length || 0;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'check-circle';
      case 'absent':
        return 'cancel';
      case 'late':
        return 'schedule';
      case 'excused':
        return 'info';
      default:
        return 'help';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#10b981';
      case 'absent':
        return '#ef4444';
      case 'late':
        return '#f59e0b';
      case 'excused':
        return '#3b82f6';
      default:
        return '#64748b';
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

        {/* Date Range Filter */}
        <Card style={styles.filterCard}>
          <Card.Content>
            <Text style={styles.filterLabel}>Time Period</Text>
            <SegmentedButtons
              value={dateRange}
              onValueChange={(value) => setDateRange(value as any)}
              buttons={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'quarter', label: 'Quarter' },
              ]}
            />
          </Card.Content>
        </Card>

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

        {/* Stats Overview */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Attendance Summary</Title>
          <View style={styles.statsGrid}>
            <Surface style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <MaterialIcons name="event" size={24} color="#3b82f6" />
              <Text style={styles.statNumber}>{totalDays}</Text>
              <Text style={styles.statLabel}>Total Days</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
              <MaterialIcons name="check-circle" size={24} color="#16a34a" />
              <Text style={styles.statNumber}>{presentDays}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
              <MaterialIcons name="cancel" size={24} color="#dc2626" />
              <Text style={styles.statNumber}>{absentDays}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="schedule" size={24} color="#d97706" />
              <Text style={styles.statNumber}>{lateDays}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </Surface>
          </View>

          <Card style={styles.percentageCard}>
            <Card.Content>
              <View style={styles.percentageContent}>
                <MaterialIcons name="trending-up" size={32} color="#10b981" />
                <View style={styles.percentageText}>
                  <Text style={styles.percentageNumber}>{attendancePercentage}%</Text>
                  <Text style={styles.percentageLabel}>Attendance Rate</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Attendance Records */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Attendance Records</Title>
          {attendanceLoading ? (
            <Card style={styles.loadingCard}>
              <Card.Content style={styles.loadingContent}>
                <MaterialIcons name="schedule" size={40} color="#94a3b8" />
                <Text style={styles.loadingText}>Loading attendance records...</Text>
              </Card.Content>
            </Card>
          ) : attendance && attendance.length > 0 ? (
            <View style={styles.recordsContainer}>
              {attendance.map((record) => (
                <Card key={record.id} style={styles.recordCard}>
                  <Card.Content>
                    <View style={styles.recordHeader}>
                      <View style={styles.recordDate}>
                        <MaterialIcons name="event" size={20} color="#64748b" />
                        <Text style={styles.recordDateText}>
                          {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
                        </Text>
                      </View>
                      <Chip
                        icon={() => (
                          <MaterialIcons
                            name={getStatusIcon(record.status) as any}
                            size={16}
                            color={getStatusColor(record.status)}
                          />
                        )}
                        style={[
                          styles.statusChip,
                          { backgroundColor: `${getStatusColor(record.status)}20` }
                        ]}
                        textStyle={{ color: getStatusColor(record.status), fontWeight: 'bold' }}
                      >
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Chip>
                    </View>
                    {record.notes && (
                      <View style={styles.recordNotes}>
                        <MaterialIcons name="note" size={16} color="#64748b" />
                        <Text style={styles.notesText}>{record.notes}</Text>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialIcons name="event-busy" size={60} color="#94a3b8" />
                <Title style={styles.emptyTitle}>No Records Found</Title>
                <Paragraph style={styles.emptyText}>
                  No attendance records found for the selected period.
                </Paragraph>
              </Card.Content>
            </Card>
          )}
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
  filterCard: {
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
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
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  percentageCard: {
    backgroundColor: '#f0fdf4',
    elevation: 2,
  },
  percentageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  percentageText: {
    flex: 1,
  },
  percentageNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  percentageLabel: {
    fontSize: 16,
    color: '#15803d',
    fontWeight: '500',
  },
  recordsContainer: {
    gap: 8,
  },
  recordCard: {
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recordDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  statusChip: {
    height: 32,
  },
  recordNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
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