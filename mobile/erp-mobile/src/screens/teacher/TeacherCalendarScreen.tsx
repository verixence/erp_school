import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
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
  Plus,
  Edit,
  Trash2,
  X,
  Save
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

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location: string;
  status: 'draft' | 'published';
}

const TeacherCalendarScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    event_type: 'academic',
    location: '',
    status: 'draft'
  });

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Fetch calendar events
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['calendar-events', user?.school_id, currentMonth, currentYear, selectedType],
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

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventTypeData = EVENT_TYPES.find(t => t.value === data.event_type);
      const payload = {
        ...data,
        color: eventTypeData?.color || '#6B7280',
        school_id: user?.school_id,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('calendar_events')
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Event created successfully!');
      setShowCreateModal(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create event');
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!editingEvent) return;

      const eventTypeData = EVENT_TYPES.find(t => t.value === data.event_type);
      const payload = {
        ...data,
        color: eventTypeData?.color || '#6B7280'
      };

      const { error } = await supabase
        .from('calendar_events')
        .update(payload)
        .eq('id', editingEvent.id);

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Event updated successfully!');
      setShowEditModal(false);
      setEditingEvent(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update event');
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Event deleted successfully!');
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete event');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      event_type: 'academic',
      location: '',
      status: 'draft'
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      event_type: event.event_type,
      location: event.location || '',
      status: event.is_published ? 'published' : 'draft'
    });
    setShowEditModal(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEventMutation.mutate(eventId) }
      ]
    );
  };

  const handleCreateEvent = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter event title');
      return;
    }
    if (!formData.event_date) {
      Alert.alert('Error', 'Please select event date');
      return;
    }
    createEventMutation.mutate(formData);
  };

  const handleUpdateEvent = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter event title');
      return;
    }
    if (!formData.event_date) {
      Alert.alert('Error', 'Please select event date');
      return;
    }
    updateEventMutation.mutate(formData);
  };

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
                  Academic Calendar
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  School events and important dates
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={openCreateModal}
              style={{
                backgroundColor: '#0d9488',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8
              }}
            >
              <Plus size={16} color="white" />
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 4 }}>
                Create
              </Text>
            </TouchableOpacity>
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

      {/* Create Event Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              Create New Event
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={{ padding: 8 }}
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            {/* Event Title */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Event Title *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder="Enter event title"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* Event Type */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Event Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {EVENT_TYPES.filter(t => t.value !== 'all').map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: formData.event_type === type.value ? type.color : '#d1d5db',
                        backgroundColor: formData.event_type === type.value ? type.color + '20' : 'white'
                      }}
                      onPress={() => setFormData(prev => ({ ...prev, event_type: type.value }))}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: formData.event_type === type.value ? type.color : '#6b7280'
                      }}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Event Date */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Event Date *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder="YYYY-MM-DD"
                value={formData.event_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, event_date: text }))}
              />
            </View>

            {/* Time Fields */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  Start Time
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16
                  }}
                  placeholder="HH:MM"
                  value={formData.start_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  End Time
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16
                  }}
                  placeholder="HH:MM"
                  value={formData.end_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))}
                />
              </View>
            </View>

            {/* Location */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Location
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder="Event location"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Description
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                multiline
                placeholder="Event description"
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              />
            </View>

            {/* Status */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { value: 'draft', label: 'Save as Draft', color: '#f59e0b' },
                  { value: 'published', label: 'Publish Event', color: '#10b981' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: formData.status === option.value ? option.color : '#d1d5db',
                      backgroundColor: formData.status === option.value ? option.color + '20' : 'white',
                      alignItems: 'center'
                    }}
                    onPress={() => setFormData(prev => ({ ...prev, status: option.value as 'draft' | 'published' }))}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: formData.status === option.value ? option.color : '#6b7280'
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            flexDirection: 'row',
            gap: 12
          }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowCreateModal(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={createEventMutation.isPending ? 'Creating...' : 'Create Event'}
              onPress={handleCreateEvent}
              disabled={createEventMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              Edit Event
            </Text>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={{ padding: 8 }}
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            {/* Same form fields as create modal */}
            {/* Event Title */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Event Title *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder="Enter event title"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* Event Type */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Event Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {EVENT_TYPES.filter(t => t.value !== 'all').map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: formData.event_type === type.value ? type.color : '#d1d5db',
                        backgroundColor: formData.event_type === type.value ? type.color + '20' : 'white'
                      }}
                      onPress={() => setFormData(prev => ({ ...prev, event_type: type.value }))}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: formData.event_type === type.value ? type.color : '#6b7280'
                      }}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Event Date */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Event Date *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder="YYYY-MM-DD"
                value={formData.event_date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, event_date: text }))}
              />
            </View>

            {/* Time Fields */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  Start Time
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16
                  }}
                  placeholder="HH:MM"
                  value={formData.start_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  End Time
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16
                  }}
                  placeholder="HH:MM"
                  value={formData.end_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))}
                />
              </View>
            </View>

            {/* Location */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Location
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder="Event location"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Description
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                multiline
                placeholder="Event description"
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              />
            </View>

            {/* Status */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { value: 'draft', label: 'Save as Draft', color: '#f59e0b' },
                  { value: 'published', label: 'Publish Event', color: '#10b981' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: formData.status === option.value ? option.color : '#d1d5db',
                      backgroundColor: formData.status === option.value ? option.color + '20' : 'white',
                      alignItems: 'center'
                    }}
                    onPress={() => setFormData(prev => ({ ...prev, status: option.value as 'draft' | 'published' }))}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: formData.status === option.value ? option.color : '#6b7280'
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            flexDirection: 'row',
            gap: 12
          }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowEditModal(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={updateEventMutation.isPending ? 'Updating...' : 'Update Event'}
              onPress={handleUpdateEvent}
              disabled={updateEventMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherCalendarScreen; 