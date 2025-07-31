import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  RefreshControl, 
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
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

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'exam' | 'holiday' | 'event' | 'meeting' | 'announcement';
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  is_all_day: boolean;
  color?: string;
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

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          event_type,
          start_date,
          end_date,
          start_time,
          end_time,
          location,
          is_all_day,
          color
        `)
        .eq('school_id', user.school_id)
        .gte('start_date', startOfMonth.toISOString().split('T')[0])
        .lte('start_date', endOfMonth.toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      if (error) throw error;

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
      case 'event': return '#3b82f6';
      case 'meeting': return '#f59e0b';
      case 'announcement': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'exam': return BookOpen;
      case 'holiday': return CalendarIcon;
      case 'event': return Users;
      case 'meeting': return Users;
      case 'announcement': return AlertCircle;
      default: return Calendar;
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'exam': return 'Exam';
      case 'holiday': return 'Holiday';
      case 'event': return 'Event';
      case 'meeting': return 'Meeting';
      case 'announcement': return 'Announcement';
      default: return eventType;
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
        const eventDate = new Date(event.start_date);
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
      <Card className="mb-4">
        <CardContent className="p-4">
          {/* Month Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => navigateMonth('prev')}
              className="p-2 rounded-lg bg-gray-100"
            >
              <ChevronLeft size={20} color="#6b7280" />
            </TouchableOpacity>
            
            <Text className="text-xl font-semibold text-gray-900">
              {monthYear}
            </Text>
            
            <TouchableOpacity
              onPress={() => navigateMonth('next')}
              className="p-2 rounded-lg bg-gray-100"
            >
              <ChevronRight size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View className="flex-row mb-2">
            {weekDays.map((day, index) => (
              <View key={index} className="flex-1 items-center py-2">
                <Text className="text-sm font-medium text-gray-600">{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="flex-row flex-wrap">
            {days.map((dayData, index) => (
              <View key={index} className="w-1/7 aspect-square p-1">
                {dayData ? (
                  <TouchableOpacity
                    className={`flex-1 items-center justify-center rounded-lg ${
                      dayData.isToday 
                        ? 'bg-blue-600' 
                        : dayData.events.length > 0 
                        ? 'bg-blue-50' 
                        : 'bg-transparent'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      dayData.isToday 
                        ? 'text-white' 
                        : dayData.events.length > 0 
                        ? 'text-blue-600' 
                        : 'text-gray-900'
                    }`}>
                      {dayData.day}
                    </Text>
                    {dayData.events.length > 0 && !dayData.isToday && (
                      <View className="w-2 h-2 bg-blue-600 rounded-full mt-1" />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View className="flex-1" />
                )}
              </View>
            ))}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderEventItem = (event: CalendarEvent) => {
    const EventIcon = getEventTypeIcon(event.event_type);
    const eventColor = event.color || getEventTypeColor(event.event_type);

    return (
      <Card key={event.id} className="mb-3">
        <CardContent className="p-4">
          <View className="flex-row items-start">
            <View 
              className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
              style={{ backgroundColor: eventColor + '20' }}
            >
              <EventIcon size={20} color={eventColor} />
            </View>
            
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {event.title}
                </Text>
                <View 
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: eventColor + '20' }}
                >
                  <Text 
                    className="text-xs font-medium"
                    style={{ color: eventColor }}
                  >
                    {getEventTypeLabel(event.event_type)}
                  </Text>
                </View>
              </View>

              {event.description && (
                <Text className="text-sm text-gray-600 mb-2">
                  {event.description}
                </Text>
              )}

              <View className="flex-row items-center space-x-4">
                <View className="flex-row items-center">
                  <Calendar size={14} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {formatDate(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date && 
                      ` - ${formatDate(event.end_date)}`
                    }
                  </Text>
                </View>

                {!event.is_all_day && event.start_time && (
                  <View className="flex-row items-center">
                    <Clock size={14} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-1">
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </Text>
                  </View>
                )}

                {event.location && (
                  <View className="flex-row items-center">
                    <MapPin size={14} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-1">
                      {event.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderListView = () => {
    // Group events by date
    const eventsByDate = filteredEvents.reduce((groups, event) => {
      const date = event.start_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, CalendarEvent[]>);

    const sortedDates = Object.keys(eventsByDate).sort();

    if (sortedDates.length === 0) {
      return (
        <View className="flex-1 justify-center items-center py-20">
          <Calendar size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-center mt-4">
            No events found for the selected criteria
          </Text>
        </View>
      );
    }

    return (
      <View>
        {sortedDates.map(date => (
          <View key={date} className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
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
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900 mb-3">Academic Calendar</Text>
        
        {/* View Toggle */}
        <View className="flex-row bg-gray-100 rounded-lg p-1 mb-3">
          {[
            { key: 'month', label: 'Month View' },
            { key: 'list', label: 'List View' }
          ].map((view) => (
            <TouchableOpacity
              key={view.key}
              onPress={() => setViewMode(view.key as any)}
              className={`flex-1 py-2 px-3 rounded-lg ${
                viewMode === view.key ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className={`text-center text-sm font-medium ${
                viewMode === view.key ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {view.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All Events', color: '#6b7280' },
            { key: 'exam', label: 'Exams', color: '#ef4444' },
            { key: 'holiday', label: 'Holidays', color: '#10b981' },
            { key: 'event', label: 'Events', color: '#3b82f6' },
            { key: 'meeting', label: 'Meetings', color: '#f59e0b' },
            { key: 'announcement', label: 'Announcements', color: '#8b5cf6' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setSelectedEventType(filter.key)}
              className={`mr-2 px-3 py-2 rounded-lg ${
                selectedEventType === filter.key ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                selectedEventType === filter.key ? 'text-white' : 'text-gray-700'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="py-4">
          {viewMode === 'month' ? (
            <>
              {renderCalendarView()}
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Events This Month
              </Text>
              {filteredEvents.length === 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Calendar size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-center mt-4">
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentCalendarScreen; 