import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  RefreshControl, 
  TouchableOpacity,
  Dimensions,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card } from '../../components/ui/Card';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  BookOpen,
  Award,
  AlertCircle,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'exam' | 'holiday' | 'ptm' | 'activity' | 'assembly' | 'sports' | 'cultural' | 'academic' | 'other';
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  color?: string;
  is_published: boolean;
}

export const ParentCalendarScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');

  // Fetch calendar events
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['calendar-events', user?.school_id, selectedDate],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!user?.school_id) return [];

      // Get the start and end of the month for the selected date
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      console.log('Fetching calendar events for:', user.school_id);

      const { data, error } = await supabase
        .from('academic_calendar_events')
        .select(`
          id,
          title,
          description,
          event_type,
          event_date,
          start_time,
          end_time,
          location,
          color,
          is_published
        `)
        .eq('school_id', user.school_id)
        .eq('is_published', true)
        .gte('event_date', startOfMonth.toISOString().split('T')[0])
        .lte('event_date', endOfMonth.toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
      }

      console.log('Fetched events:', data?.length || 0);
      return data || [];
    },
    enabled: !!user?.school_id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchEvents();
    setRefreshing(false);
  };

  const filteredEvents = events.filter(event => {
    if (selectedEventType === 'all') return true;
    return event.event_type === selectedEventType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date('2000-01-01 ' + timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'exam': return '#ef4444';
      case 'holiday': return '#10b981';
      case 'ptm': return '#f59e0b';
      case 'activity': return '#3b82f6';
      case 'assembly': return '#8b5cf6';
      case 'sports': return '#059669';
      case 'cultural': return '#dc2626';
      case 'academic': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'exam': return BookOpen;
      case 'holiday': return CalendarIcon;
      case 'ptm': return Users;
      case 'activity': return Users;
      case 'assembly': return AlertCircle;
      case 'sports': return Award;
      case 'cultural': return Users;
      case 'academic': return BookOpen;
      default: return Calendar;
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'exam': return 'Exam';
      case 'holiday': return 'Holiday';
      case 'ptm': return 'Parent Meeting';
      case 'activity': return 'Activity';
      case 'assembly': return 'Assembly';
      case 'sports': return 'Sports';
      case 'cultural': return 'Cultural';
      case 'academic': return 'Academic';
      default: return eventType.charAt(0).toUpperCase() + eventType.slice(1);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate.toDateString() === dayDate.toDateString();
      });
      
      days.push({
        day,
        date: dayDate,
        events: dayEvents,
        isToday: dayDate.toDateString() === new Date().toDateString()
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const monthYear = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const renderCalendarView = () => {
    const days = getDaysInMonth(selectedDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16 }}>
          {/* Month Navigation */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: 16 
          }}>
            <TouchableOpacity
              onPress={() => navigateMonth('prev')}
              style={{ 
                padding: 8, 
                borderRadius: 8, 
                backgroundColor: '#f3f4f6' 
              }}
            >
              <ChevronLeft size={20} color="#6b7280" />
            </TouchableOpacity>
            
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '600', 
              color: '#111827' 
            }}>
              {monthYear}
            </Text>
            
            <TouchableOpacity
              onPress={() => navigateMonth('next')}
              style={{ 
                padding: 8, 
                borderRadius: 8, 
                backgroundColor: '#f3f4f6' 
              }}
            >
              <ChevronRight size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {weekDays.map((day, index) => (
              <View key={index} style={{ 
                flex: 1, 
                alignItems: 'center', 
                paddingVertical: 8 
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  color: '#6b7280' 
                }}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map((dayData, index) => (
              <View key={index} style={{ 
                width: screenWidth / 7 - 10, 
                aspectRatio: 1, 
                padding: 2,
                marginHorizontal: 2,
                marginVertical: 2
              }}>
                {dayData ? (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: dayData.isToday 
                        ? '#8b5cf6' 
                        : dayData.events.length > 0 
                        ? '#ede9fe' 
                        : 'transparent'
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: dayData.isToday 
                        ? 'white' 
                        : dayData.events.length > 0 
                        ? '#8b5cf6' 
                        : '#111827'
                    }}>
                      {dayData.day}
                    </Text>
                    {dayData.events.length > 0 && !dayData.isToday && (
                      <View style={{ 
                        width: 6, 
                        height: 6, 
                        backgroundColor: '#8b5cf6', 
                        borderRadius: 3, 
                        marginTop: 2 
                      }} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            ))}
          </View>
        </View>
      </Card>
    );
  };

  const renderEventItem = (event: CalendarEvent) => {
    const EventIcon = getEventTypeIcon(event.event_type);
    const eventColor = event.color || getEventTypeColor(event.event_type);

    return (
      <Card key={event.id} style={{ marginBottom: 12 }}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View 
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                backgroundColor: eventColor + '20'
              }}
            >
              <EventIcon size={20} color={eventColor} />
            </View>
            
            <View style={{ flex: 1 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 4 
              }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '600', 
                  color: '#111827',
                  flex: 1
                }}>
                  {event.title}
                </Text>
                <View 
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: eventColor + '20'
                  }}
                >
                  <Text 
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: eventColor
                    }}
                  >
                    {getEventTypeLabel(event.event_type)}
                  </Text>
                </View>
              </View>

              {event.description && (
                <Text style={{ 
                  fontSize: 14, 
                  color: '#6b7280', 
                  marginBottom: 8 
                }}>
                  {event.description}
                </Text>
              )}

              <View style={{ flexDirection: 'column', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={14} color="#6b7280" />
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#6b7280', 
                    marginLeft: 6 
                  }}>
                    {formatDate(event.event_date)}
                  </Text>
                </View>

                {event.start_time && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={14} color="#6b7280" />
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#6b7280', 
                      marginLeft: 6 
                    }}>
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </Text>
                  </View>
                )}

                {event.location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={14} color="#6b7280" />
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#6b7280', 
                      marginLeft: 6 
                    }}>
                      {event.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderListView = () => {
    // Group events by date
    const eventsByDate = filteredEvents.reduce((groups, event) => {
      const date = event.event_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, CalendarEvent[]>);

    const sortedDates = Object.keys(eventsByDate).sort();

    if (sortedDates.length === 0) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          paddingVertical: 80 
        }}>
          <Calendar size={48} color="#9ca3af" />
          <Text style={{ 
            color: '#6b7280', 
            textAlign: 'center', 
            marginTop: 16,
            fontSize: 16
          }}>
            No events found for the selected criteria
          </Text>
        </View>
      );
    }

    return (
      <View>
        {sortedDates.map(date => (
          <View key={date} style={{ marginBottom: 24 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: 12 
            }}>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
            {eventsByDate[date].map(renderEventItem)}
          </View>
        ))}
      </View>
    );
  };

  if (eventsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading calendar...</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
                Academic Calendar
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                View school events and important dates
              </Text>
            </View>
          </View>
        </View>
        
        {/* View Toggle */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: '#f3f4f6', 
          borderRadius: 8, 
          padding: 4, 
          marginTop: 16,
          marginBottom: 12
        }}>
          {[
            { key: 'month', label: 'Month View' },
            { key: 'list', label: 'List View' }
          ].map((view) => (
            <TouchableOpacity
              key={view.key}
              onPress={() => setViewMode(view.key as any)}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: viewMode === view.key ? 'white' : 'transparent',
                shadowColor: viewMode === view.key ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: viewMode === view.key ? 0.1 : 0,
                shadowRadius: 2,
                elevation: viewMode === view.key ? 2 : 0
              }}
            >
              <Text style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '500',
                color: viewMode === view.key ? '#111827' : '#6b7280'
              }}>
                {view.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'all', label: 'All Events', color: '#6b7280' },
              { key: 'exam', label: 'Exams', color: '#ef4444' },
              { key: 'holiday', label: 'Holidays', color: '#10b981' },
              { key: 'ptm', label: 'PTM', color: '#f59e0b' },
              { key: 'activity', label: 'Activities', color: '#3b82f6' },
              { key: 'assembly', label: 'Assembly', color: '#8b5cf6' }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedEventType(filter.key)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: selectedEventType === filter.key ? '#8b5cf6' : '#f3f4f6'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: selectedEventType === filter.key ? 'white' : '#6b7280'
                }}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'month' ? (
          <>
            {renderCalendarView()}
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: 12 
            }}>
              Events This Month
            </Text>
            {filteredEvents.length === 0 ? (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center', 
                paddingVertical: 40 
              }}>
                <Calendar size={48} color="#9ca3af" />
                <Text style={{ 
                  color: '#6b7280', 
                  textAlign: 'center', 
                  marginTop: 16,
                  fontSize: 16
                }}>
                  No events this month
                </Text>
              </View>
            ) : (
              filteredEvents.map(renderEventItem)
            )}
          </>
        ) : (
          renderListView()
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentCalendarScreen;