import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'events' | 'create'>('events');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const tabs = [
    { id: 'events', label: 'Events', icon: 'calendar' },
    { id: 'create', label: 'Create Event', icon: 'add-circle' },
  ];

  const eventTypes = [
    { value: 'exam', label: 'Exam', color: '#EF4444' },
    { value: 'holiday', label: 'Holiday', color: '#10B981' },
    { value: 'meeting', label: 'Meeting', color: '#3B82F6' },
    { value: 'event', label: 'Event', color: '#8B5CF6' },
    { value: 'deadline', label: 'Deadline', color: '#F59E0B' },
    { value: 'other', label: 'Other', color: '#6B7280' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academic Calendar</Text>
        <Text style={styles.headerSubtitle}>Manage school events and important dates</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab.id as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={selectedTab === tab.id ? '#3B82F6' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'events' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            
            {/* Events List */}
            <View style={styles.eventsList}>
              <View style={styles.eventCard}>
                <View style={[styles.eventIndicator, { backgroundColor: '#EF4444' }]} />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>Mid-term Examinations</Text>
                    <Text style={styles.eventType}>Exam</Text>
                  </View>
                  <Text style={styles.eventDate}>March 15, 2024 - March 22, 2024</Text>
                  <Text style={styles.eventTime}>9:00 AM - 12:00 PM</Text>
                  <Text style={styles.eventLocation}>All Classrooms</Text>
                </View>
                <TouchableOpacity style={styles.eventAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.eventCard}>
                <View style={[styles.eventIndicator, { backgroundColor: '#10B981' }]} />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>Spring Break</Text>
                    <Text style={styles.eventType}>Holiday</Text>
                  </View>
                  <Text style={styles.eventDate}>March 25, 2024 - April 1, 2024</Text>
                  <Text style={styles.eventTime}>All Day</Text>
                  <Text style={styles.eventLocation}>School Closed</Text>
                </View>
                <TouchableOpacity style={styles.eventAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.eventCard}>
                <View style={[styles.eventIndicator, { backgroundColor: '#3B82F6' }]} />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>Parent-Teacher Conference</Text>
                    <Text style={styles.eventType}>Meeting</Text>
                  </View>
                  <Text style={styles.eventDate}>April 5, 2024</Text>
                  <Text style={styles.eventTime}>2:00 PM - 6:00 PM</Text>
                  <Text style={styles.eventLocation}>Main Hall</Text>
                </View>
                <TouchableOpacity style={styles.eventAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.eventCard}>
                <View style={[styles.eventIndicator, { backgroundColor: '#8B5CF6' }]} />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>Annual Sports Day</Text>
                    <Text style={styles.eventType}>Event</Text>
                  </View>
                  <Text style={styles.eventDate}>April 12, 2024</Text>
                  <Text style={styles.eventTime}>8:00 AM - 5:00 PM</Text>
                  <Text style={styles.eventLocation}>Sports Ground</Text>
                </View>
                <TouchableOpacity style={styles.eventAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'create' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create New Event</Text>
            
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Title</Text>
                <View style={styles.formInput}>
                  <Text style={styles.formInputPlaceholder}>Enter event title...</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Type</Text>
                <View style={styles.eventTypeSelector}>
                  {eventTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.eventTypeOption, { borderColor: type.color }]}
                    >
                      <View style={[styles.eventTypeColor, { backgroundColor: type.color }]} />
                      <Text style={styles.eventTypeLabel}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Date</Text>
                  <View style={styles.formInput}>
                    <Text style={styles.formInputPlaceholder}>Select date...</Text>
                  </View>
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Time</Text>
                  <View style={styles.formInput}>
                    <Text style={styles.formInputPlaceholder}>Select time...</Text>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <View style={styles.formInput}>
                  <Text style={styles.formInputPlaceholder}>Enter event location...</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <View style={[styles.formInput, styles.formTextArea]}>
                  <Text style={styles.formInputPlaceholder}>Enter event description...</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.formRow}>
                  <View style={styles.checkbox}>
                    <Ionicons name="checkbox" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.checkboxLabel}>Publish immediately</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.formRow}>
                  <View style={styles.checkbox}>
                    <Ionicons name="square-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={styles.checkboxLabel}>Recurring event</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.createButton}>
                <Text style={styles.createButtonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Calendar View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar Overview</Text>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarNavButton}>
                <Ionicons name="chevron-back" size={20} color="#3B82F6" />
              </TouchableOpacity>
              <Text style={styles.calendarMonth}>March 2024</Text>
              <TouchableOpacity style={styles.calendarNavButton}>
                <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarGrid}>
              <View style={styles.weekdayRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Text key={day} style={styles.weekdayText}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.daysGrid}>
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 6 + 1;
                  const isCurrentMonth = day > 0 && day <= 31;
                  const hasEvent = [15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31].includes(day);
                  
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.calendarDay,
                        !isCurrentMonth && styles.calendarDayInactive,
                        hasEvent && styles.calendarDayWithEvent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !isCurrentMonth && styles.calendarDayTextInactive,
                        ]}
                      >
                        {isCurrentMonth ? day : ''}
                      </Text>
                      {hasEvent && <View style={styles.eventDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Event Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="school" size={24} color="#EF4444" />
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Exams</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="sunny" size={24} color="#10B981" />
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Holidays</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#8B5CF6" />
              <Text style={styles.statValue}>10</Text>
              <Text style={styles.statLabel}>Meetings</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  eventType: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  eventLocation: {
    fontSize: 12,
    color: '#9ca3af',
  },
  eventAction: {
    padding: 8,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  formGroupHalf: {
    flex: 1,
    gap: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  formTextArea: {
    height: 80,
  },
  formInputPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  eventTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  eventTypeColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  eventTypeLabel: {
    fontSize: 12,
    color: '#374151',
  },
  checkbox: {
    width: 20,
    height: 20,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  calendarGrid: {
    gap: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarDay: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDayWithEvent: {
    backgroundColor: '#eff6ff',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  calendarDayTextInactive: {
    color: '#9ca3af',
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 