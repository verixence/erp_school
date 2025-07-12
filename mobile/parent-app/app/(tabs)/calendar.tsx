import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Chip, Text, Button, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren } from '../../src/hooks/useParentData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';

const { width: screenWidth } = Dimensions.get('window');

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  event_type: 'exam' | 'holiday' | 'meeting' | 'event' | 'deadline' | 'other';
  location: string;
  is_published: boolean;
  created_at: string;
  school_id: string;
}

const EVENT_COLORS = {
  exam: '#EF4444',
  holiday: '#10B981',
  meeting: '#3B82F6',
  event: '#8B5CF6',
  deadline: '#F59E0B',
  other: '#6B7280',
};

const EVENT_ICONS = {
  exam: 'school',
  holiday: 'celebration',
  meeting: 'group',
  event: 'event',
  deadline: 'schedule',
  other: 'info',
};

export default function CalendarScreen() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: children } = useChildren(user?.id);
  const schoolId = children?.[0]?.sections?.school_id;

  // Fetch calendar events
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['calendar-events', schoolId, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      
      const { data, error } = await supabase
        .from('academic_calendar_events')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .gte('event_date', format(startDate, 'yyyy-MM-dd'))
        .lte('event_date', format(endDate, 'yyyy-MM-dd'))
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return [];
      }

      return data;
    },
    enabled: !!schoolId,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.event_date), date)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    const dateEvents = getEventsForDate(date);
    if (dateEvents.length > 0) {
      setSelectedEvent(dateEvents[0]);
      setShowEventModal(true);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  const upcomingEvents = events
    .filter(event => new Date(event.event_date) >= new Date())
    .slice(0, 5);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Academic Calendar</Title>
          <Paragraph style={styles.headerSubtitle}>
            View school events and important dates
          </Paragraph>
        </View>

        {/* Calendar Navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <MaterialIcons name="chevron-left" size={24} color="#3B82F6" />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {format(currentDate, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <MaterialIcons name="chevron-right" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              const hasEvents = dayEvents.length > 0;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    !isCurrentMonth && styles.calendarDayOtherMonth,
                    isTodayDate && styles.calendarDayToday,
                    hasEvents && styles.calendarDayWithEvents,
                  ]}
                  onPress={() => selectDate(day)}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      !isCurrentMonth && styles.calendarDayTextOtherMonth,
                      isTodayDate && styles.calendarDayTextToday,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {hasEvents && (
                    <View style={styles.eventIndicator}>
                                             <View
                         style={[
                           styles.eventDot,
                           { backgroundColor: EVENT_COLORS[dayEvents[0].event_type as keyof typeof EVENT_COLORS] }
                         ]}
                       />
                      {dayEvents.length > 1 && (
                        <Text style={styles.eventCount}>+{dayEvents.length - 1}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Event Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Event Types</Text>
          <View style={styles.legendGrid}>
            {Object.entries(EVENT_COLORS).map(([type, color]) => (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.upcomingContainer}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Upcoming Events</Text>
              <Text style={styles.emptySubtitle}>
                No events scheduled for the coming days
              </Text>
            </View>
          ) : (
            upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              >
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventIcon}>
                                                 <MaterialIcons
                           name={EVENT_ICONS[event.event_type as keyof typeof EVENT_ICONS] as any}
                           size={24}
                           color={EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS]}
                         />
                      </View>
                      <View style={styles.eventContent}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDate}>
                          {formatDate(event.event_date)}
                          {event.event_time && ` at ${formatTime(event.event_time)}`}
                        </Text>
                        {event.location && (
                          <Text style={styles.eventLocation}>
                            📍 {event.location}
                          </Text>
                        )}
                      </View>
                                             <Chip
                         style={[styles.eventTypeChip, { backgroundColor: EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS] }]}
                         textStyle={styles.eventTypeText}
                       >
                        {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Event Detail Modal */}
      <Portal>
        <Modal
          visible={showEventModal}
          onDismiss={() => setShowEventModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedEvent && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialIcons
                    name={EVENT_ICONS[selectedEvent.event_type] as any}
                    size={32}
                    color={EVENT_COLORS[selectedEvent.event_type]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowEventModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Title style={styles.modalTitle}>{selectedEvent.title}</Title>
              
              <View style={styles.modalDetails}>
                <View style={styles.modalDetailRow}>
                  <MaterialIcons name="event" size={20} color="#6B7280" />
                  <Text style={styles.modalDetailText}>
                    {formatDate(selectedEvent.event_date)}
                  </Text>
                </View>
                
                {selectedEvent.event_time && (
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="schedule" size={20} color="#6B7280" />
                    <Text style={styles.modalDetailText}>
                      {formatTime(selectedEvent.event_time)}
                    </Text>
                  </View>
                )}
                
                {selectedEvent.location && (
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="location-on" size={20} color="#6B7280" />
                    <Text style={styles.modalDetailText}>
                      {selectedEvent.location}
                    </Text>
                  </View>
                )}
                
                <View style={styles.modalDetailRow}>
                  <MaterialIcons name="category" size={20} color="#6B7280" />
                  <Chip
                    style={[styles.modalEventTypeChip, { backgroundColor: EVENT_COLORS[selectedEvent.event_type] }]}
                    textStyle={styles.modalEventTypeText}
                  >
                    {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
                  </Chip>
                </View>
              </View>
              
              {selectedEvent.description && (
                <View style={styles.modalDescription}>
                  <Text style={styles.modalDescriptionTitle}>Description</Text>
                  <Text style={styles.modalDescriptionText}>
                    {selectedEvent.description}
                  </Text>
                </View>
              )}
              
              <Button
                mode="contained"
                style={styles.modalButton}
                onPress={() => setShowEventModal(false)}
              >
                Close
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
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
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
  },
  calendarDay: {
    width: screenWidth / 7 - 4,
    height: 48,
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: '#3B82F6',
  },
  calendarDayWithEvents: {
    backgroundColor: '#f3f4f6',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  calendarDayTextOtherMonth: {
    color: '#9ca3af',
  },
  calendarDayTextToday: {
    color: '#ffffff',
    fontWeight: '600',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  eventCount: {
    fontSize: 8,
    color: '#6b7280',
  },
  legendContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  upcomingContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  eventCard: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventTypeChip: {
    height: 24,
  },
  eventTypeText: {
    fontSize: 10,
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContent: {
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalIcon: {
    padding: 8,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  modalDetails: {
    marginBottom: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  modalEventTypeChip: {
    height: 24,
    marginLeft: 8,
  },
  modalEventTypeText: {
    fontSize: 10,
    color: '#ffffff',
  },
  modalDescription: {
    marginBottom: 20,
  },
  modalDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalDescriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 8,
  },
}); 