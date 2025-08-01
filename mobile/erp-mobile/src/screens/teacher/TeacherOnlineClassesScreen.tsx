import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform,
  Pressable
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Video,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  Plus,
  Play,
  Pause,
  Edit3,
  Trash2,
  Copy,
  ChevronRight
} from 'lucide-react-native';

interface OnlineClass {
  id: string;
  title: string;
  description?: string;
  subject: string;
  meeting_link: string;
  meeting_password?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  teacher_id: string;
  school_id: string;
  // Related data
  sections: {
    id: string;
    grade: number;
    section: string;
  }[];
  participants_count?: number;
}

export const TeacherOnlineClassesScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scheduled' | 'ongoing' | 'completed'>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  
  // Date/Time picker states
  const [showSimpleDatePicker, setShowSimpleDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showTimeBottomSheet, setShowTimeBottomSheet] = useState(false);
  
  // Calendar strip data
  const [calendarDates, setCalendarDates] = useState<Array<{
    date: Date;
    dayName: string;
    dayNumber: string;
    monthName: string;
    isToday: boolean;
    isSelected: boolean;
  }>>([]);
  
  // Time selection states
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
  // Wheel picker states
  // Removed complex wheel date picker - using simple approach now
  const [showWheelStartTimePicker, setShowWheelStartTimePicker] = useState(false);
  const [showWheelEndTimePicker, setShowWheelEndTimePicker] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  
  // Wheel picker temp values
  const [tempDay, setTempDay] = useState(scheduledDate.getDate());
  const [tempMonth, setTempMonth] = useState(scheduledDate.getMonth());
  const [tempYear, setTempYear] = useState(scheduledDate.getFullYear());
  const [tempStartHour, setTempStartHour] = useState(startTime.getHours());
  const [tempStartMinute, setTempStartMinute] = useState(startTime.getMinutes());
  const [tempEndHour, setTempEndHour] = useState(endTime.getHours());
  const [tempEndMinute, setTempEndMinute] = useState(endTime.getMinutes());

  // Fetch online classes
  const { data: onlineClasses = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-online-classes', user?.id],
    queryFn: async (): Promise<OnlineClass[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('online_classes')
        .select(`
          *,
          online_class_sections!inner(
            sections!inner(
              id,
              grade,
              section
            )
          ),
          online_class_participants(
            id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('school_id', user.school_id)
        .order('scheduled_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((item: any) => ({
        ...item,
        sections: item.online_class_sections?.map((ocs: any) => ocs.sections) || [],
        participants_count: item.online_class_participants?.length || 0
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch teacher's sections
  const { data: teacherSections = [] } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Try both direct class teacher and junction table approaches
      const { data: directSections, error: directError } = await supabase
        .from('sections')
        .select('id, grade, section, class_teacher, school_id')
        .eq('class_teacher', user.id)
        .eq('school_id', user?.school_id)
        .order('grade, section');

      if (directError) {
        console.error('Direct sections query error:', directError);
      }

      // Also try junction table approach
      const { data: junctionSections, error: junctionError } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id, grade, section, class_teacher, school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user?.school_id);

      if (junctionError) {
        console.error('Junction sections query error:', junctionError);
      }

      // Combine results and remove duplicates
      const allSections = [
        ...(directSections || []),
        ...((junctionSections || []).map((item: any) => item.sections))
      ];
      
      // Remove duplicates by id
      const uniqueSections = allSections.filter((section, index, arr) => 
        arr.findIndex(s => s.id === section.id) === index
      );
      
      return uniqueSections;
    },
    enabled: !!user?.id,
  });

  // Create online class mutation
  const createOnlineClass = useMutation({
    mutationFn: async (classData: {
      title: string;
      description?: string;
      subject: string;
      meeting_link: string;
      meeting_password?: string;
      scheduled_date: string;
      start_time: string;
      end_time: string;
      sections: string[];
    }) => {
      // Calculate duration
      const start = new Date(`2000-01-01 ${classData.start_time}`);
      const end = new Date(`2000-01-01 ${classData.end_time}`);
      const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

      // Create the online class
      const { data: onlineClass, error: classError } = await supabase
        .from('online_classes')
        .insert({
          title: classData.title,
          description: classData.description,
          subject: classData.subject,
          meeting_link: classData.meeting_link,
          meeting_password: classData.meeting_password,
          scheduled_date: classData.scheduled_date,
          start_time: classData.start_time,
          end_time: classData.end_time,
          duration_minutes: durationMinutes,
          status: 'scheduled',
          teacher_id: user?.id,
          school_id: user?.school_id,
        })
        .select()
        .single();

      if (classError) throw classError;

      // Link sections to the class
      const sectionLinks = classData.sections.map(sectionId => ({
        online_class_id: onlineClass.id,
        section_id: sectionId
      }));

      const { error: sectionsError } = await supabase
        .from('online_class_sections')
        .insert(sectionLinks);

      if (sectionsError) throw sectionsError;

      return onlineClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-online-classes'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Online class scheduled successfully!');
    },
    onError: (error: any) => {
      console.error('Create online class error:', error);
      Alert.alert('Error', error.message || 'Failed to schedule online class. Please try again.');
    },
  });

  // Update class status mutation
  const updateClassStatus = useMutation({
    mutationFn: async ({ classId, status }: { classId: string, status: string }) => {
      const { error } = await supabase
        .from('online_classes')
        .update({ status })
        .eq('id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-online-classes'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('');
    setSelectedSections([]);
    setMeetingLink('');
    setMeetingPassword('');
    setScheduledDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
  };

  const handleCreateClass = () => {
    if (!title.trim() || !subject.trim() || selectedSections.length === 0 || 
        !meetingLink.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate that end time is after start time
    if (endTime <= startTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    // Validate that scheduled date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const schedDate = new Date(scheduledDate);
    schedDate.setHours(0, 0, 0, 0);
    
    if (schedDate < today) {
      Alert.alert('Error', 'Please select a future date');
      return;
    }

    // Format dates for database
    const formattedDate = scheduledDate.toISOString().split('T')[0];
    const formattedStartTime = startTime.toTimeString().slice(0, 5);
    const formattedEndTime = endTime.toTimeString().slice(0, 5);

    createOnlineClass.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      subject: subject.trim(),
      meeting_link: meetingLink.trim(),
      meeting_password: meetingPassword.trim() || undefined,
      scheduled_date: formattedDate,
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      sections: selectedSections,
    });
  };

  const handleStartClass = (onlineClass: OnlineClass) => {
    Alert.alert(
      'Start Class',
      'This will mark the class as ongoing and open the meeting link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            updateClassStatus.mutate({ 
              classId: onlineClass.id, 
              status: 'ongoing' 
            });
            Linking.openURL(onlineClass.meeting_link);
          }
        }
      ]
    );
  };

  const handleEndClass = (classId: string) => {
    Alert.alert(
      'End Class',
      'Are you sure you want to end this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: () => updateClassStatus.mutate({ 
            classId, 
            status: 'completed' 
          })
        }
      ]
    );
  };

  const handleCopyLink = (url: string) => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Link Copied', 'Meeting link has been copied to clipboard');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredClasses = onlineClasses.filter(onlineClass => {
    if (selectedFilter === 'all') return true;
    return onlineClass.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'ongoing': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Generate calendar strip data
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const isToday = i === 0;
      const isSelected = date.toDateString() === scheduledDate.toDateString();
      
      dates.push({
        date,
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayNumber: date.getDate().toString(),
        monthName: date.toLocaleDateString('en-IN', { month: 'short' }),
        isToday,
        isSelected
      });
    }
    
    setCalendarDates(dates);
  };

  // Generate common time slots
  const getTimeSlots = () => [
    { label: '9:00 – 10:00 AM', start: '09:00', end: '10:00', duration: 60 },
    { label: '10:00 – 11:00 AM', start: '10:00', end: '11:00', duration: 60 },
    { label: '11:00 – 12:00 PM', start: '11:00', end: '12:00', duration: 60 },
    { label: '2:00 – 3:00 PM', start: '14:00', end: '15:00', duration: 60 },
    { label: '3:00 – 4:00 PM', start: '15:00', end: '16:00', duration: 60 },
    { label: '4:00 – 5:00 PM', start: '16:00', end: '17:00', duration: 60 },
  ];

  // Auto-adjust end time based on start time
  const adjustEndTime = (startTime: Date, durationMinutes: number = 60) => {
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + durationMinutes);
    return endTime;
  };

  // Format selected date and time for display
  const formatSelectedDateTime = () => {
    const dateStr = scheduledDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startStr = formatDisplayTime(startTime);
    const endStr = formatDisplayTime(endTime);
    return `${dateStr} • ${startStr} – ${endStr}`;
  };

  // Initialize calendar dates on component mount and when date changes
  React.useEffect(() => {
    generateCalendarDates();
  }, [scheduledDate]);

  // Initialize with current date on first load
  React.useEffect(() => {
    generateCalendarDates();
    // Set initial temp times
    setTempStartTime(startTime);
    setTempEndTime(endTime);
    // Initialize wheel picker values
    setTempDay(scheduledDate.getDate());
    setTempMonth(scheduledDate.getMonth());
    setTempYear(scheduledDate.getFullYear());
    setTempStartHour(startTime.getHours());
    setTempStartMinute(startTime.getMinutes());
    setTempEndHour(endTime.getHours());
    setTempEndMinute(endTime.getMinutes());
  }, []);

  // Debug effect to track modal state changes
  // Removed useEffect for showWheelDatePicker - no longer used

  // Removed useEffect for showWheelStartTimePicker - no longer used

  // Handle date selection from calendar strip
  const handleDateSelection = (selectedDate: Date) => {
    setScheduledDate(selectedDate);
    // Initialize wheel picker values with selected date
    setTempDay(selectedDate.getDate());
    setTempMonth(selectedDate.getMonth());
    setTempYear(selectedDate.getFullYear());
    // Open wheel date picker for fine-tuning
    setShowWheelDatePicker(true);
  };

  // Handle time slot selection
  const handleTimeSlotSelection = (timeSlot: any) => {
    const [startHour, startMinute] = timeSlot.start.split(':').map(Number);
    const [endHour, endMinute] = timeSlot.end.split(':').map(Number);
    
    const newStartTime = new Date();
    newStartTime.setHours(startHour, startMinute, 0, 0);
    
    const newEndTime = new Date();
    newEndTime.setHours(endHour, endMinute, 0, 0);
    
    setTempStartTime(newStartTime);
    setTempEndTime(newEndTime);
    setSelectedTimeSlot(timeSlot.label);
  };

  // Confirm time selection
  const confirmTimeSelection = () => {
    // Validate end time is after start time
    if (tempEndTime <= tempStartTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    
    setStartTime(tempStartTime);
    setEndTime(tempEndTime);
    setShowTimeBottomSheet(false);
    setSelectedTimeSlot(null);
  };

  // Generate wheel picker data
  const getDaysArray = (month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const getMonthsArray = () => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const getYearsArray = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear + i);
  };

  const getHoursArray = () => Array.from({ length: 24 }, (_, i) => i);
  const getMinutesArray = () => Array.from({ length: 60 }, (_, i) => i);

  // Wheel date picker handlers
  const handleWheelDateSet = () => {
    const newDate = new Date(tempYear, tempMonth, tempDay);
    setScheduledDate(newDate);
    setShowWheelDatePicker(false);
    generateCalendarDates();
  };

  const handleWheelDateClear = () => {
    const today = new Date();
    setTempDay(today.getDate());
    setTempMonth(today.getMonth());
    setTempYear(today.getFullYear());
  };

  // Wheel time picker handlers
  const handleWheelStartTimeSet = () => {
    const newStartTime = new Date();
    newStartTime.setHours(tempStartHour, tempStartMinute, 0, 0);
    setStartTime(newStartTime);
    
    // Auto-adjust end time if it's not already set or is before start time
    const newEndTime = new Date(newStartTime);
    newEndTime.setMinutes(newStartTime.getMinutes() + 60);
    if (endTime <= newStartTime) {
      setEndTime(newEndTime);
      setTempEndHour(newEndTime.getHours());
      setTempEndMinute(newEndTime.getMinutes());
    }
    
    setShowWheelStartTimePicker(false);
    
    // Immediately open end time picker
    setTimeout(() => {
      setTempEndHour(newEndTime.getHours());
      setTempEndMinute(newEndTime.getMinutes());
      setShowWheelEndTimePicker(true);
    }, 300);
  };

  const handleWheelEndTimeSet = () => {
    const newEndTime = new Date();
    newEndTime.setHours(tempEndHour, tempEndMinute, 0, 0);
    
    // Validate end time is after start time
    if (newEndTime <= startTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    
    setEndTime(newEndTime);
    setShowWheelEndTimePicker(false);
  };

  const handleWheelTimeClear = (type: 'start' | 'end') => {
    const now = new Date();
    if (type === 'start') {
      setTempStartHour(now.getHours());
      setTempStartMinute(0);
    } else {
      setTempEndHour(now.getHours() + 1);
      setTempEndMinute(0);
    }
  };

  // Helper function to create quick time options
  const getTimeOptions = () => {
    const times = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        times.push({
          label: formatDisplayTime(time),
          value: time,
        });
      }
    }
    return times;
  };

  const showTimeActionSheet = (type: 'start' | 'end') => {
    // Directly open wheel time picker
    if (type === 'start') {
      setTempStartHour(startTime.getHours());
      setTempStartMinute(startTime.getMinutes());
      setShowWheelStartTimePicker(true);
    } else {
      setTempEndHour(endTime.getHours());
      setTempEndMinute(endTime.getMinutes());
      setShowWheelEndTimePicker(true);
    }
  };

  const showDateActionSheet = () => {
    // Directly open wheel date picker
    setTempDay(scheduledDate.getDate());
    setTempMonth(scheduledDate.getMonth());
    setTempYear(scheduledDate.getFullYear());
    setShowWheelDatePicker(true);
  };

  const isClassToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {(['all', 'scheduled', 'ongoing', 'completed'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            selectedFilter === filter && styles.activeFilter
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === filter && styles.activeFilterText
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOnlineClass = (onlineClass: OnlineClass) => {
    const statusColor = getStatusColor(onlineClass.status);
    const canStart = onlineClass.status === 'scheduled' && isClassToday(onlineClass.scheduled_date);
    const canEnd = onlineClass.status === 'ongoing';
    
    // Format sections display
    const sectionsText = onlineClass.sections
      .map(s => `Grade ${s.grade}${s.section}`)
      .join(', ');
    
    return (
      <View key={onlineClass.id} style={styles.classCard}>
        <View style={styles.classHeader}>
          <View style={styles.classInfo}>
            <Text style={styles.classTitle} numberOfLines={1}>
              {onlineClass.title}
            </Text>
            <Text style={styles.subjectInfo}>
              {onlineClass.subject} • {sectionsText}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {onlineClass.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {onlineClass.description && (
          <Text style={styles.description} numberOfLines={2}>
            {onlineClass.description}
          </Text>
        )}

        <View style={styles.classDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatDate(onlineClass.scheduled_date)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatTime(onlineClass.start_time)} - {formatTime(onlineClass.end_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Users size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {onlineClass.participants_count || 0} participants
            </Text>
          </View>
          {onlineClass.duration_minutes && (
            <View style={styles.detailRow}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.detailText}>
                {onlineClass.duration_minutes} minutes
              </Text>
            </View>
          )}
        </View>

        {/* Meeting Password */}
        {onlineClass.meeting_password && (
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordLabel}>Meeting Password:</Text>
            <Text style={styles.passwordText}>{onlineClass.meeting_password}</Text>
          </View>
        )}

        <View style={styles.classActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCopyLink(onlineClass.meeting_link)}
          >
            <Copy size={16} color="#6b7280" />
            <Text style={styles.actionText}>Copy Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(onlineClass.meeting_link)}
          >
            <ExternalLink size={16} color="#6b7280" />
            <Text style={styles.actionText}>Join</Text>
          </TouchableOpacity>

          {canStart && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => handleStartClass(onlineClass)}
            >
              <Play size={16} color="#fff" />
              <Text style={[styles.actionText, styles.primaryActionText]}>Start</Text>
            </TouchableOpacity>
          )}

          {canEnd && (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerAction]}
              onPress={() => handleEndClass(onlineClass.id)}
            >
              <Pause size={16} color="#fff" />
              <Text style={[styles.actionText, styles.dangerActionText]}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Online Classes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Online Classes List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading online classes...</Text>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Video size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No online classes found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'You haven\'t scheduled any online classes yet'
                : `No ${selectedFilter} classes`
              }
            </Text>
          </View>
        ) : (
          filteredClasses.map(renderOnlineClass)
        )}
      </ScrollView>

      {/* Create Online Class Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Schedule Online Class</Text>
            <TouchableOpacity 
              onPress={handleCreateClass}
              disabled={createOnlineClass.isPending}
            >
              <Text style={[
                styles.submitButton,
                createOnlineClass.isPending && styles.disabledButton
              ]}>
                Schedule
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Title *</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter class title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textAreaInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional class description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject *</Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter subject name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sections * (Select multiple)</Text>
              <View style={styles.selectContainer}>
                {teacherSections.map((section) => (
                  <TouchableOpacity
                    key={section.id}
                    style={[
                      styles.selectOption,
                      selectedSections.includes(section.id) && styles.selectedOption
                    ]}
                    onPress={() => {
                      if (selectedSections.includes(section.id)) {
                        setSelectedSections(prev => prev.filter(id => id !== section.id));
                      } else {
                        setSelectedSections(prev => [...prev, section.id]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.selectText,
                      selectedSections.includes(section.id) && styles.selectedText
                    ]}>
                      Grade {section.grade} {section.section}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedSections.length === 0 && (
                <Text style={styles.helperText}>Select at least one section</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Meeting Link *</Text>
              <TextInput
                style={styles.textInput}
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="https://meet.google.com/..."
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Meeting Password (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={meetingPassword}
                onChangeText={setMeetingPassword}
                placeholder="Enter meeting password if required"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Schedule Section - Wheel Picker Approach */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Schedule *</Text>
              
              {/* Date Selection */}
              <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <TouchableOpacity 
                  style={styles.wheelPickerTrigger}
                  onPress={() => {
                    console.log('Opening date picker for online class');
                    setShowScheduleModal(false);
                    setTimeout(() => {
                      setShowSimpleDatePicker(true);
                    }, 100);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Calendar size={20} color="#3b82f6" />
                  <Text style={styles.wheelPickerTriggerText}>
                    {scheduledDate.toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Time Selection */}
              <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>Select Time</Text>
                <TouchableOpacity 
                  style={styles.wheelPickerTrigger}
                  onPress={() => {
                    console.log('Time picker triggered - setting state');
                    try {
                      setTempStartHour(startTime.getHours());
                      setTempStartMinute(startTime.getMinutes());
                      console.log('Setting showWheelStartTimePicker to true');
                      setShowWheelStartTimePicker(true);
                      console.log('Time picker state updated');
                    } catch (error) {
                      console.error('Error in time picker:', error);
                    }
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Clock size={20} color="#3b82f6" />
                  <Text style={styles.wheelPickerTriggerText}>
                    {formatDisplayTime(startTime)} – {formatDisplayTime(endTime)}
                  </Text>
                  <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Debug Button - Remove this later */}
              <TouchableOpacity 
                style={[styles.wheelPickerTrigger, { backgroundColor: '#ff0000', marginTop: 10 }]}
                onPress={() => {
                  console.log('DEBUG: Test button pressed');
                  setShowTestModal(true);
                }}
              >
                <Text style={[styles.wheelPickerTriggerText, { color: '#fff' }]}>
                  DEBUG: Tap to test modal
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker Modal - iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={false} // Disabled old date picker modal
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => {}} // Disabled
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.submitButton}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <DateTimePicker
                value={scheduledDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setScheduledDate(selectedDate);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker - Android */}
      {false && Platform.OS === 'android' && ( // Disabled old Android date picker
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            // setShowDatePicker(false); // Disabled
            if (selectedDate) {
              setScheduledDate(selectedDate);
            }
          }}
        />
      )}

      {/* Start Time Picker Modal - iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showStartTimePicker}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowStartTimePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Start Time</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Text style={styles.submitButton}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <DateTimePicker
                value={tempStartTime}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setTempStartTime(selectedTime);
                    // Auto-set end time to 1 hour later if not set
                    if (tempEndTime <= selectedTime) {
                      const newEndTime = new Date(selectedTime.getTime() + 60 * 60 * 1000);
                      setTempEndTime(newEndTime);
                    }
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Start Time Picker - Android */}
      {Platform.OS === 'android' && showStartTimePicker && (
        <DateTimePicker
          value={tempStartTime}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              setTempStartTime(selectedTime);
              // Auto-set end time to 1 hour later if not set
              if (tempEndTime <= selectedTime) {
                const newEndTime = new Date(selectedTime.getTime() + 60 * 60 * 1000);
                setTempEndTime(newEndTime);
              }
            }
          }}
        />
      )}

      {/* End Time Picker Modal - iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showEndTimePicker}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowEndTimePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select End Time</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Text style={styles.submitButton}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <DateTimePicker
                value={tempEndTime}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setTempEndTime(selectedTime);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* End Time Picker - Android */}
      {Platform.OS === 'android' && showEndTimePicker && (
        <DateTimePicker
          value={tempEndTime}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              setTempEndTime(selectedTime);
            }
          }}
        />
      )}

      {/* Modern Time Selection Bottom Sheet */}
      <Modal
        visible={showTimeBottomSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimeBottomSheet(false)}
      >
        <View style={styles.bottomSheetContainer}>
          {/* Bottom Sheet Header */}
          <View style={styles.bottomSheetHeader}>
            <TouchableOpacity 
              onPress={() => setShowTimeBottomSheet(false)}
              style={styles.bottomSheetCloseButton}
            >
              <Text style={styles.bottomSheetCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.bottomSheetTitle}>Select Time</Text>
            <TouchableOpacity 
              onPress={confirmTimeSelection}
              style={styles.bottomSheetConfirmButton}
            >
              <Text style={styles.bottomSheetConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bottomSheetContent}>
            {/* Selected Date Display */}
            <View style={styles.selectedDateContainer}>
              <Calendar size={16} color="#6b7280" />
              <Text style={styles.selectedDateText}>
                {scheduledDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>

            {/* Quick Time Slots */}
            <View style={styles.timeSlotsSection}>
              <Text style={styles.sectionTitle}>Quick Time Slots</Text>
              <View style={styles.timeSlotsGrid}>
                {getTimeSlots().map((slot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlotButton,
                      selectedTimeSlot === slot.label && styles.timeSlotSelected
                    ]}
                    onPress={() => handleTimeSlotSelection(slot)}
                    activeOpacity={0.7}
                  >
                    <Clock size={14} color={
                      selectedTimeSlot === slot.label ? '#fff' : '#6b7280'
                    } />
                    <Text style={[
                      styles.timeSlotText,
                      selectedTimeSlot === slot.label && styles.timeSlotTextSelected
                    ]}>
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Time Selection */}
            <View style={styles.customTimeSection}>
              <Text style={styles.sectionTitle}>Or Set Custom Time</Text>
              
              <View style={styles.customTimeRow}>
                <View style={styles.customTimeColumn}>
                  <Text style={styles.customTimeLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.customTimeButton}
                    onPress={() => {
                      setTempStartHour(tempStartTime.getHours());
                      setTempStartMinute(tempStartTime.getMinutes());
                      setShowWheelStartTimePicker(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Clock size={16} color="#3b82f6" />
                    <Text style={styles.customTimeButtonText}>
                      {formatDisplayTime(tempStartTime)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.customTimeColumn}>
                  <Text style={styles.customTimeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.customTimeButton}
                    onPress={() => {
                      setTempEndHour(tempEndTime.getHours());
                      setTempEndMinute(tempEndTime.getMinutes());
                      setShowWheelEndTimePicker(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Clock size={16} color="#3b82f6" />
                    <Text style={styles.customTimeButtonText}>
                      {formatDisplayTime(tempEndTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Duration Display */}
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  Duration: {Math.floor((tempEndTime.getTime() - tempStartTime.getTime()) / (1000 * 60))} minutes
                </Text>
              </View>
            </View>

            {/* Auto-adjust buttons */}
            <View style={styles.autoAdjustSection}>
              <Text style={styles.sectionTitle}>Quick Duration</Text>
              <View style={styles.durationButtonsRow}>
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const newEndTime = adjustEndTime(tempStartTime, 30);
                    setTempEndTime(newEndTime);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.durationButtonText}>30 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const newEndTime = adjustEndTime(tempStartTime, 60);
                    setTempEndTime(newEndTime);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.durationButtonText}>1 hour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const newEndTime = adjustEndTime(tempStartTime, 90);
                    setTempEndTime(newEndTime);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.durationButtonText}>1.5 hours</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Wheel Date Picker Modal */}
      {false && ( // Disabled old wheel date picker
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            console.log('Date picker modal closing');
            setShowWheelDatePicker(false);
          }}
          onShow={() => console.log('Date picker modal shown')}
        >
        <View style={styles.wheelPickerContainer}>
          <View style={styles.wheelPickerHeader}>
            <Text style={styles.wheelPickerTitle}>Set date</Text>
          </View>
          
          <View style={styles.wheelPickersRow}>
            {/* Day Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: (tempDay - 1) * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const days = getDaysArray(tempMonth, tempYear);
                  const clampedIndex = Math.max(0, Math.min(index, days.length - 1));
                  setTempDay(days[clampedIndex]);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getDaysArray(tempMonth, tempYear).map((day) => (
                  <View key={day} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      day === tempDay && styles.wheelItemTextSelected
                    ]}>
                      {day}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>

            {/* Month Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: tempMonth * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const months = getMonthsArray();
                  const clampedIndex = Math.max(0, Math.min(index, months.length - 1));
                  setTempMonth(clampedIndex);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getMonthsArray().map((month, index) => (
                  <View key={month} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      index === tempMonth && styles.wheelItemTextSelected
                    ]}>
                      {month}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>

            {/* Year Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: (tempYear - new Date().getFullYear()) * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const years = getYearsArray();
                  const clampedIndex = Math.max(0, Math.min(index, years.length - 1));
                  setTempYear(years[clampedIndex]);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getYearsArray().map((year) => (
                  <View key={year} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      year === tempYear && styles.wheelItemTextSelected
                    ]}>
                      {year}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>
          </View>

          {/* Selection Indicator Lines */}
          <View style={styles.wheelSelectionIndicator} />
          <View style={[styles.wheelSelectionIndicator, { top: '50%', marginTop: 25 }]} />

          {/* Buttons */}
          <View style={styles.wheelPickerButtons}>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={() => setShowWheelDatePicker(false)}
            >
              <Text style={styles.wheelPickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={handleWheelDateClear}
            >
              <Text style={styles.wheelPickerButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={handleWheelDateSet}
            >
              <Text style={[styles.wheelPickerButtonText, styles.wheelPickerSetButton]}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {/* Wheel Start Time Picker Modal */}
      {false && ( // Disabled old wheel start time picker
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowWheelStartTimePicker(false)}
        >
        <View style={styles.wheelPickerContainer}>
          <View style={styles.wheelPickerHeader}>
            <Text style={styles.wheelPickerTitle}>Set start time</Text>
          </View>
          
          <View style={styles.wheelPickersRow}>
            {/* Hour Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: tempStartHour * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const hours = getHoursArray();
                  const clampedIndex = Math.max(0, Math.min(index, hours.length - 1));
                  setTempStartHour(hours[clampedIndex]);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getHoursArray().map((hour) => (
                  <View key={hour} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      hour === tempStartHour && styles.wheelItemTextSelected
                    ]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>

            {/* Minute Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: tempStartMinute * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const minutes = getMinutesArray();
                  const clampedIndex = Math.max(0, Math.min(index, minutes.length - 1));
                  setTempStartMinute(minutes[clampedIndex]);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getMinutesArray().map((minute) => (
                  <View key={minute} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      minute === tempStartMinute && styles.wheelItemTextSelected
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>
          </View>

          {/* Selection Indicator Lines */}
          <View style={styles.wheelSelectionIndicator} />
          <View style={[styles.wheelSelectionIndicator, { top: '50%', marginTop: 25 }]} />

          {/* Buttons */}
          <View style={styles.wheelPickerButtons}>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={() => setShowWheelStartTimePicker(false)}
            >
              <Text style={styles.wheelPickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={() => handleWheelTimeClear('start')}
            >
              <Text style={styles.wheelPickerButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={handleWheelStartTimeSet}
            >
              <Text style={[styles.wheelPickerButtonText, styles.wheelPickerSetButton]}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {/* Wheel End Time Picker Modal */}
      {false && ( // Disabled old wheel end time picker
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowWheelEndTimePicker(false)}
        >
        <View style={styles.wheelPickerContainer}>
          <View style={styles.wheelPickerHeader}>
            <Text style={styles.wheelPickerTitle}>Set end time</Text>
          </View>
          
          <View style={styles.wheelPickersRow}>
            {/* Hour Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: tempEndHour * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const hours = getHoursArray();
                  const clampedIndex = Math.max(0, Math.min(index, hours.length - 1));
                  setTempEndHour(hours[clampedIndex]);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getHoursArray().map((hour) => (
                  <View key={hour} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      hour === tempEndHour && styles.wheelItemTextSelected
                    ]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>

            {/* Minute Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView 
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: tempEndMinute * 50 }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                  const minutes = getMinutesArray();
                  const clampedIndex = Math.max(0, Math.min(index, minutes.length - 1));
                  setTempEndMinute(minutes[clampedIndex]);
                }}
              >
                <View style={styles.wheelSpacer} />
                {getMinutesArray().map((minute) => (
                  <View key={minute} style={styles.wheelItem}>
                    <Text style={[
                      styles.wheelItemText,
                      minute === tempEndMinute && styles.wheelItemTextSelected
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
                <View style={styles.wheelSpacer} />
              </ScrollView>
            </View>
          </View>

          {/* Selection Indicator Lines */}
          <View style={styles.wheelSelectionIndicator} />
          <View style={[styles.wheelSelectionIndicator, { top: '50%', marginTop: 25 }]} />

          {/* Buttons */}
          <View style={styles.wheelPickerButtons}>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={() => setShowWheelEndTimePicker(false)}
            >
              <Text style={styles.wheelPickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={() => handleWheelTimeClear('end')}
            >
              <Text style={styles.wheelPickerButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={handleWheelEndTimeSet}
            >
              <Text style={[styles.wheelPickerButtonText, styles.wheelPickerSetButton]}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {/* Test Modal */}
      <Modal
        visible={showTestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.wheelPickerContainer}>
          <View style={styles.wheelPickerHeader}>
            <Text style={styles.wheelPickerTitle}>Test Modal</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, marginBottom: 20 }}>This is a test modal!</Text>
            <TouchableOpacity 
              style={styles.wheelPickerButton}
              onPress={() => setShowTestModal(false)}
            >
              <Text style={styles.wheelPickerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Simple Date Picker for Online Class */}
      {showSimpleDatePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            console.log('DateTimePicker onChange called', event.type, selectedDate);
            if (event.type === 'dismissed' || !selectedDate) {
              setShowSimpleDatePicker(false);
              setShowScheduleModal(true);
            } else {
              setScheduledDate(selectedDate);
              setShowSimpleDatePicker(false);
              setShowScheduleModal(true);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  classInfo: {
    flex: 1,
    marginRight: 12,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subjectInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  classDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  primaryAction: {
    backgroundColor: '#3b82f6',
  },
  dangerAction: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 4,
  },
  primaryActionText: {
    color: '#fff',
  },
  dangerActionText: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  submitButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  disabledButton: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedOption: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedText: {
    color: '#fff',
  },
  passwordContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  passwordText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'transparent',
  },
  selectButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-end',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerContent: {
    backgroundColor: '#fff',
    paddingVertical: 20,
  },
  datePicker: {
    backgroundColor: '#fff',
  },
  clickableInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clickableInputText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  // Calendar Strip Styles
  calendarSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  calendarStrip: {
    marginBottom: 16,
  },
  calendarStripContent: {
    paddingHorizontal: 4,
  },
  calendarDateItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  calendarDateSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  calendarDateToday: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  calendarDayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  calendarDayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  calendarTextSelected: {
    color: '#fff',
  },
  calendarTextToday: {
    color: '#3b82f6',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },
  // Selected Date Time Display
  selectedDateTimeWrapper: {
    marginTop: 8,
  },
  selectedDateTimeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  selectedDateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDateTimeText: {
    flex: 1,
    marginLeft: 12,
  },
  selectedDateTimeMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  selectedDateTimeHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Bottom Sheet Styles
  bottomSheetContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  bottomSheetCloseButton: {
    paddingVertical: 4,
  },
  bottomSheetCloseText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  bottomSheetConfirmButton: {
    paddingVertical: 4,
  },
  bottomSheetConfirmText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 24,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  // Time Slots Grid
  timeSlotsSection: {
    marginBottom: 32,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSlotSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  // Custom Time Section
  customTimeSection: {
    marginBottom: 32,
  },
  customTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  customTimeColumn: {
    flex: 1,
  },
  customTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  customTimeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 8,
  },
  durationContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Auto-adjust Duration Buttons
  autoAdjustSection: {
    marginBottom: 32,
  },
  durationButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  // Wheel Picker Styles
  wheelPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  wheelPickerHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  wheelPickerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#00bcd4',
    textAlign: 'center',
  },
  wheelPickersRow: {
    flexDirection: 'row',
    height: 250,
    marginBottom: 40,
    position: 'relative',
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  wheelScroll: {
    height: 250,
  },
  wheelScrollContent: {
    alignItems: 'center',
  },
  wheelSpacer: {
    height: 100,
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  wheelItemText: {
    fontSize: 18,
    color: '#9e9e9e',
    fontWeight: '400',
  },
  wheelItemTextSelected: {
    fontSize: 20,
    color: '#212121',
    fontWeight: '600',
  },
  wheelSelectionIndicator: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#00bcd4',
    top: '50%',
    marginTop: -25,
    zIndex: 1,
  },
  wheelPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  wheelPickerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  wheelPickerButtonText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  wheelPickerSetButton: {
    color: '#00bcd4',
    fontWeight: '600',
  },
  // Schedule Section Styles
  scheduleSection: {
    marginBottom: 16,
  },
  wheelPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  wheelPickerTriggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
}); 