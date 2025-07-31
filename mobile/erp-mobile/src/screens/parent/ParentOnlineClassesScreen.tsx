import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  RefreshControl, 
  TouchableOpacity,
  Alert,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  ExternalLink,
  Play,
  BookOpen,
  Monitor,
  Link as LinkIcon,
  Eye,
  User,
  Filter,
  ChevronDown
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
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  teacher: {
    first_name: string;
    last_name: string;
    email: string;
  };
  student_names: string[];
}

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  grade: number;
  section: string;
}

export const ParentOnlineClassesScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [selectedChild, setSelectedChild] = useState<string>('');

  // Fetch parent's children
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            admission_no,
            grade,
            section
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        grade: item.students.grade,
        section: item.students.section
      }));
    },
    enabled: !!user?.id,
  });

  // Set default child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch online classes for selected child
  const { data: onlineClasses = [], isLoading: classesLoading, refetch: refetchClasses } = useQuery({
    queryKey: ['online-classes', selectedChild],
    queryFn: async (): Promise<OnlineClass[]> => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('online_class_participants')
        .select(`
          online_class:online_classes(
            id,
            title,
            description,
            subject,
            meeting_link,
            meeting_password,
            scheduled_date,
            start_time,
            end_time,
            duration_minutes,
            status,
            teacher:users!teacher_id(first_name, last_name, email)
          ),
          student:students(id, full_name, admission_no, grade, section)
        `)
        .eq('student_id', selectedChild)
        .neq('online_class.status', 'cancelled');

      if (error) throw error;

      // Transform the data to group by online class
      const classesMap = new Map<string, OnlineClass>();
      
      data?.forEach((participant: any) => {
        const onlineClass = participant.online_class;
        if (onlineClass) {
          const existingClass = classesMap.get(onlineClass.id);
          if (existingClass) {
            existingClass.student_names?.push(participant.student?.full_name || 'Unknown');
          } else {
            classesMap.set(onlineClass.id, {
              ...onlineClass,
              student_names: [participant.student?.full_name || 'Unknown']
            });
          }
        }
      });

      return Array.from(classesMap.values()).sort((a, b) => 
        new Date(a.scheduled_date + ' ' + a.start_time).getTime() - 
        new Date(b.scheduled_date + ' ' + b.start_time).getTime()
      );
    },
    enabled: !!selectedChild,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchClasses();
    setRefreshing(false);
  };

  const filteredClasses = onlineClasses.filter(onlineClass => {
    const classDateTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
    const now = new Date();

    switch (selectedFilter) {
      case 'upcoming':
        return classDateTime > now || onlineClass.status === 'live';
      case 'completed':
        return classDateTime < now && onlineClass.status === 'completed';
      default:
        return true;
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return '#ef4444';
      case 'scheduled': return '#3b82f6';
      case 'completed': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'LIVE';
      case 'scheduled': return 'Scheduled';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const isClassLive = (onlineClass: OnlineClass) => {
    const now = new Date();
    const startTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
    const endTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.end_time);
    
    return now >= startTime && now <= endTime && onlineClass.status !== 'completed';
  };

  const handleJoinClass = async (onlineClass: OnlineClass) => {
    if (!onlineClass.meeting_link) {
      Alert.alert('Error', 'Meeting link not available');
      return;
    }

    const canJoin = isClassLive(onlineClass) || onlineClass.status === 'live';
    
    if (!canJoin) {
      const startTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
      const now = new Date();
      
      if (startTime > now) {
        Alert.alert(
          'Class Not Started',
          `This class is scheduled for ${formatDate(onlineClass.scheduled_date)} at ${formatTime(onlineClass.start_time)}. Please join when the class begins.`
        );
        return;
      }
    }

    try {
      const supported = await Linking.canOpenURL(onlineClass.meeting_link);
      if (supported) {
        await Linking.openURL(onlineClass.meeting_link);
      } else {
        Alert.alert('Error', 'Cannot open meeting link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join the class. Please try again.');
    }
  };

  const renderOnlineClass = (onlineClass: OnlineClass) => {
    const isLive = isClassLive(onlineClass);
    const classDateTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
    const now = new Date();
    const isPast = classDateTime < now && !isLive;

    return (
      <Card key={onlineClass.id} className="mb-4">
        <CardContent className="p-4">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                {onlineClass.title}
              </Text>
              <Text className="text-sm text-gray-600 mb-2">
                {onlineClass.subject}
              </Text>
              <View className="flex-row items-center">
                <User size={14} color="#6b7280" />
                <Text className="text-sm text-gray-600 ml-1">
                  {onlineClass.teacher.first_name} {onlineClass.teacher.last_name}
                </Text>
              </View>
            </View>
            
            <View style={{ 
              backgroundColor: getStatusColor(isLive ? 'live' : onlineClass.status) + '20',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12
            }}>
              <Text style={{ 
                color: getStatusColor(isLive ? 'live' : onlineClass.status),
                fontSize: 12,
                fontWeight: '600'
              }}>
                {isLive ? 'LIVE' : getStatusText(onlineClass.status)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {onlineClass.description && (
            <Text className="text-sm text-gray-700 mb-3" numberOfLines={2}>
              {onlineClass.description}
            </Text>
          )}

          {/* Class Details */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Calendar size={14} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-1">
                {formatDate(onlineClass.scheduled_date)}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Clock size={14} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-1">
                {formatTime(onlineClass.start_time)} - {formatTime(onlineClass.end_time)}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Users size={14} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-1">
                {onlineClass.student_names.length} students
              </Text>
            </View>
          </View>

          {/* Meeting Password */}
          {onlineClass.meeting_password && (
            <View className="bg-gray-50 p-3 rounded-lg mb-3">
              <Text className="text-sm font-medium text-gray-700 mb-1">Meeting Password:</Text>
              <Text className="text-sm text-gray-900 font-mono">{onlineClass.meeting_password}</Text>
            </View>
          )}

          {/* Actions */}
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => handleJoinClass(onlineClass)}
              disabled={isPast && onlineClass.status === 'completed'}
              className={`flex-1 px-4 py-2 rounded-lg flex-row items-center justify-center ${
                isLive 
                  ? 'bg-red-600' 
                  : isPast && onlineClass.status === 'completed'
                  ? 'bg-gray-300'
                  : 'bg-blue-600'
              }`}
            >
              {isLive ? (
                <Play size={16} color="white" />
              ) : (
                <Video size={16} color={isPast ? '#6b7280' : 'white'} />
              )}
              <Text className={`ml-2 font-medium ${
                isPast && onlineClass.status === 'completed' ? 'text-gray-600' : 'text-white'
              }`}>
                {isLive ? 'Join Live' : isPast ? 'Class Ended' : 'Join Class'}
              </Text>
            </TouchableOpacity>
            
            {onlineClass.meeting_link && (
              <TouchableOpacity
                onPress={() => Linking.openURL(onlineClass.meeting_link)}
                className="px-3 py-2 bg-gray-200 rounded-lg"
              >
                <ExternalLink size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  if (childrenLoading || classesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading online classes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900 mb-3">Online Classes</Text>
        
        {/* Child Selector */}
        {children.length > 1 && (
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Select Child:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  className={`mr-2 px-3 py-2 rounded-lg ${
                    selectedChild === child.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    selectedChild === child.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {child.full_name}
                  </Text>
                  <Text className={`text-xs ${
                    selectedChild === child.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    Grade {child.grade}-{child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Filter Tabs */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' },
            { key: 'all', label: 'All' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedFilter(tab.key as any)}
              className={`flex-1 py-2 px-3 rounded-lg ${
                selectedFilter === tab.key ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className={`text-center text-sm font-medium ${
                selectedFilter === tab.key ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="py-4">
          {filteredClasses.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <Video size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4">
                {selectedFilter === 'upcoming' 
                  ? 'No upcoming online classes scheduled'
                  : selectedFilter === 'completed'
                  ? 'No completed classes to show'
                  : 'No online classes available'
                }
              </Text>
            </View>
          ) : (
            filteredClasses.map(renderOnlineClass)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 