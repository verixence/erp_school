import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Users,
  Trophy,
  Music,
  Zap,
  User,
  ChevronDown
} from 'lucide-react-native';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  location: string | null;
  color: string;
  is_published: boolean;
}

interface Child {
  id: string;
  full_name: string;
  grade: number;
  section: string;
  school_id: string;
}

const EVENT_TYPES = [
  { value: 'all', label: 'All Events', color: '#6B7280', icon: Calendar },
  { value: 'holiday', label: 'Holiday', color: '#EF4444', icon: Calendar },
  { value: 'exam', label: 'Exam', color: '#DC2626', icon: GraduationCap },
  { value: 'ptm', label: 'Parent-Teacher Meeting', color: '#7C3AED', icon: Users },
  { value: 'activity', label: 'Activity', color: '#059669', icon: Zap },
  { value: 'assembly', label: 'Assembly', color: '#2563EB', icon: Users },
  { value: 'sports', label: 'Sports', color: '#EA580C', icon: Trophy },
  { value: 'cultural', label: 'Cultural', color: '#DB2777', icon: Music },
  { value: 'academic', label: 'Academic', color: '#0D9488', icon: BookOpen },
  { value: 'other', label: 'Other', color: '#6B7280', icon: Calendar }
];

export const ParentCalendarScreen = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showChildModal, setShowChildModal] = useState(false);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Fetch parent's children
  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data: studentParents, error: spError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', user.id);

      if (spError || !studentParents?.length) return [];

      const studentIds = studentParents.map(sp => sp.student_id);
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade, section, school_id')
        .in('id', studentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch calendar events
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['parent-calendar-events', user?.school_id, currentMonth, currentYear, selectedType, selectedChild],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!user?.school_id) return [];

      // Get events for current month
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);

      let query = supabase
        .from('academic_calendar_events')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('is_published', true)
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (selectedType !== 'all') {
        query = query.eq('event_type', selectedType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    setCurrentDate(newDate);
  };

  const getSelectedChildName = () => {
    if (selectedChild === 'all') return 'All Children';
    const child = children.find(c => c.id === selectedChild);
    return child?.full_name || 'Select Child';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.event_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
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
              backgroundColor: '#0d9488', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <Calendar size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                School Calendar
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Important dates and events
              </Text>
            </View>
          </View>
        </View>

        {/* Month Navigation */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginTop: 16
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

          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
            {getMonthName(currentDate)}
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

        {/* Filters */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
          {children.length > 1 && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8
              }}
              onPress={() => setShowChildModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <User size={16} color="#6b7280" />
                <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
                  {getSelectedChildName()}
                </Text>
              </View>
              <ChevronDown size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Event Type Filter */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {EVENT_TYPES.slice(0, 6).map((type) => (
              <TouchableOpacity
                key={type.value}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedType === type.value ? type.color : '#f3f4f6',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => setSelectedType(type.value)}
              >
                <type.icon 
                  size={16} 
                  color={selectedType === type.value ? 'white' : '#6b7280'} 
                />
                <Text style={{
                  marginLeft: 6,
                  color: selectedType === type.value ? 'white' : '#6b7280',
                  fontWeight: selectedType === type.value ? '600' : '400',
                  fontSize: 12
                }}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Events List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {Object.keys(groupedEvents).length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <Calendar size={48} color="#6b7280" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              No Events This Month
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              {selectedType === 'all' 
                ? 'No events are scheduled for this month.'
                : `No ${selectedType} events are scheduled for this month.`
              }
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 16 }}>
            {Object.entries(groupedEvents)
              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
              .map(([date, dayEvents]) => (
                <View key={date}>
                  {/* Date Header */}
                  <View style={{ 
                    backgroundColor: '#f3f4f6',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    marginBottom: 8
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                      {formatDate(date)}
                    </Text>
                  </View>

                  {/* Events for this date */}
                  {dayEvents.map((event) => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    return (
                      <Card key={event.id} style={{ padding: 16, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          {/* Event Type Icon */}
                          <View style={{
                            backgroundColor: typeInfo.color + '20',
                            padding: 8,
                            borderRadius: 8,
                            marginRight: 12
                          }}>
                            <typeInfo.icon size={20} color={typeInfo.color} />
                          </View>

                          {/* Event Details */}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ 
                                fontSize: 16, 
                                fontWeight: '600', 
                                color: '#111827',
                                flex: 1
                              }}>
                                {event.title}
                              </Text>
                              <View style={{
                                backgroundColor: typeInfo.color + '20',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12
                              }}>
                                <Text style={{
                                  fontSize: 12,
                                  color: typeInfo.color,
                                  fontWeight: '500',
                                  textTransform: 'capitalize'
                                }}>
                                  {typeInfo.label}
                                </Text>
                              </View>
                            </View>

                            {event.description && (
                              <Text style={{ 
                                fontSize: 14, 
                                color: '#6b7280',
                                marginBottom: 8,
                                lineHeight: 20
                              }}>
                                {event.description}
                              </Text>
                            )}

                            {/* Time and Location */}
                            <View style={{ gap: 4 }}>
                              {(event.start_time || event.end_time) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Clock size={14} color="#6b7280" />
                                  <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>
                                    {event.start_time && formatTime(event.start_time)}
                                    {event.start_time && event.end_time && ' - '}
                                    {event.end_time && formatTime(event.end_time)}
                                  </Text>
                                </View>
                              )}

                              {event.location && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <MapPin size={14} color="#6b7280" />
                                  <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>
                                    {event.location}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Child Selector Modal */}
      {children.length > 1 && (
        <Modal
          visible={showChildModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowChildModal(false)}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <View style={{ 
              backgroundColor: 'white', 
              borderRadius: 12,
              padding: 24,
              width: '80%',
              maxWidth: 300
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
                Select Child
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedChild === 'all' ? '#0d9488' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedChild('all');
                  setShowChildModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedChild === 'all' ? '#0d9488' : '#111827',
                  fontWeight: selectedChild === 'all' ? '600' : '400'
                }}>
                  All Children
                </Text>
              </TouchableOpacity>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedChild === child.id ? '#0d9488' + '20' : 'transparent'
                  }}
                  onPress={() => {
                    setSelectedChild(child.id);
                    setShowChildModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedChild === child.id ? '#0d9488' : '#111827',
                    fontWeight: selectedChild === child.id ? '600' : '400'
                  }}>
                    {child.full_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Grade {child.grade} - {child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default ParentCalendarScreen; 