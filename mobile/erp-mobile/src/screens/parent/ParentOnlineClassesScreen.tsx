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
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  teacher: {
    first_name: string;
    last_name: string;
    email: string;
  };
  student_names: string[];
  created_at: string;
  school_id: string;
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

      // Try both student_parents table and direct parent_id lookup
      let students: Child[] = [];
      
      // First try student_parents junction table
      const { data: junctionData, error: junctionError } = await supabase
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

      if (!junctionError && junctionData) {
        students = junctionData.map((item: any) => ({
          id: item.students.id,
          full_name: item.students.full_name,
          admission_no: item.students.admission_no,
          grade: item.students.grade,
          section: item.students.section
        }));
      }

      // If no students found, try direct parent_id lookup
      if (students.length === 0) {
        const { data: directData, error: directError } = await supabase
          .from('students')
          .select('id, full_name, admission_no, grade, section')
          .eq('parent_id', user.id);

        if (!directError && directData) {
          students = directData.map((student: any) => ({
            id: student.id,
            full_name: student.full_name,
            admission_no: student.admission_no,
            grade: parseInt(student.grade) || 0,
            section: student.section
          }));
        }
      }

      return students;
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
    queryKey: ['parent-online-classes', selectedChild, user?.school_id],
    queryFn: async (): Promise<OnlineClass[]> => {
      if (!selectedChild || !user?.school_id) return [];

      // First, get the child's section info
      const { data: childData, error: childError } = await supabase
        .from('students')
        .select('id, grade, section, section_id')
        .eq('id', selectedChild)
        .single();

      if (childError) {
        console.error('Error fetching child data:', childError);
        return [];
      }

      // Get online classes through participants table
      const { data: participantData, error: participantError } = await supabase
        .from('online_class_participants')
        .select(`
          online_classes!inner(
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
            created_at,
            school_id,
            teacher_id
          )
        `)
        .eq('student_id', selectedChild)
        .neq('online_classes.status', 'cancelled');

      let classes: any[] = [];
      
      if (!participantError && participantData) {
        classes = participantData.map((p: any) => p.online_classes);
      }

      // If no classes found through participants, try section-based lookup
      if (classes.length === 0 && childData.section_id) {
        const { data: sectionClasses, error: sectionError } = await supabase
          .from('online_class_sections')
          .select(`
            online_classes!inner(
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
              created_at,
              school_id,
              teacher_id
            )
          `)
          .eq('section_id', childData.section_id)
          .neq('online_classes.status', 'cancelled');

        if (!sectionError && sectionClasses) {
          classes = sectionClasses.map((sc: any) => sc.online_classes);
        }
      }

      // Get teacher information for each class
      const classesWithTeachers = await Promise.all(
        classes.map(async (onlineClass: any) => {
          const { data: teacherData } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', onlineClass.teacher_id)
            .single();

          return {
            ...onlineClass,
            teacher: teacherData || { first_name: 'Unknown', last_name: 'Teacher', email: '' },
            student_names: [children.find(c => c.id === selectedChild)?.full_name || 'Student']
          };
        })
      );

      // Remove duplicates and sort by date/time
      const uniqueClasses = classesWithTeachers
        .filter((cls, index, arr) => arr.findIndex(c => c.id === cls.id) === index)
        .sort((a, b) => 
          new Date(a.scheduled_date + ' ' + a.start_time).getTime() - 
          new Date(b.scheduled_date + ' ' + b.start_time).getTime()
        );

      return uniqueClasses;
    },
    enabled: !!selectedChild && !!user?.school_id && children.length > 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchClasses();
    setRefreshing(false);
  };

  // Define isClassLive function before using it
  const isClassLive = (onlineClass: OnlineClass) => {
    const now = new Date();
    const startTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
    const endTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.end_time);
    
    return (now >= startTime && now <= endTime && onlineClass.status !== 'completed') || onlineClass.status === 'ongoing';
  };

  const canJoinClass = (onlineClass: OnlineClass) => {
    const now = new Date();
    const startTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
    const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000); // 15 minutes before
    const endTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.end_time);
    
    return now >= joinWindowStart && now <= endTime && onlineClass.status !== 'completed';
  };

  const filteredClasses = onlineClasses.filter(onlineClass => {
    const classDateTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
    const now = new Date();
    const isLive = isClassLive(onlineClass);

    switch (selectedFilter) {
      case 'upcoming':
        return classDateTime > now || isLive || onlineClass.status === 'ongoing';
      case 'completed':
        return classDateTime < now && onlineClass.status === 'completed' && !isLive;
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date('2000-01-01 ' + timeString).toLocaleTimeString('en-IN', {
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

  const getStatusText = (status: string, isLive: boolean = false) => {
    if (isLive) return 'LIVE';
    switch (status) {
      case 'ongoing': return 'LIVE';
      case 'scheduled': return 'Scheduled';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleJoinClass = async (onlineClass: OnlineClass) => {
    if (!onlineClass.meeting_link) {
      Alert.alert('Error', 'Meeting link not available');
      return;
    }

    const canJoin = canJoinClass(onlineClass);
    
    if (!canJoin) {
      const startTime = new Date(onlineClass.scheduled_date + ' ' + onlineClass.start_time);
      const now = new Date();
      
      if (startTime > now) {
        const minutesUntilJoin = Math.ceil((startTime.getTime() - now.getTime() - 15 * 60 * 1000) / (1000 * 60));
        Alert.alert(
          'अभी नहीं जुड़ सकते / Cannot Join Yet',
          `आप इस क्लास में ${minutesUntilJoin > 0 ? `${minutesUntilJoin} मिनट में` : '15 मिनट पहले'} जुड़ सकते हैं। \n\nYou can join this class ${minutesUntilJoin > 0 ? `in ${minutesUntilJoin} minutes` : '15 minutes before the start time'}. Class starts at ${formatTime(onlineClass.start_time)}.`
        );
        return;
      } else if (onlineClass.status === 'completed') {
        Alert.alert('क्लास समाप्त / Class Ended', 'This class has already ended.');
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
      <Card key={onlineClass.id} style={{ marginBottom: 16 }}>
        <CardContent style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between', 
            marginBottom: 12 
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: '#111827', 
                marginBottom: 4 
              }}>
                {onlineClass.title}
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginBottom: 8 
              }}>
                {onlineClass.subject}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <User size={14} color="#6b7280" />
                <Text style={{ 
                  fontSize: 14, 
                  color: '#6b7280', 
                  marginLeft: 4 
                }}>
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
                {getStatusText(onlineClass.status, isLive)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {onlineClass.description && (
            <Text style={{ 
              fontSize: 14, 
              color: '#374151', 
              marginBottom: 12,
              lineHeight: 20
            }} numberOfLines={2}>
              {onlineClass.description}
            </Text>
          )}

          {/* Class Details */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: 12,
            flexWrap: 'wrap'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Calendar size={14} color="#6b7280" />
              <Text style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginLeft: 4 
              }}>
                {formatDate(onlineClass.scheduled_date)}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Clock size={14} color="#6b7280" />
              <Text style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginLeft: 4 
              }}>
                {formatTime(onlineClass.start_time)} - {formatTime(onlineClass.end_time)}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Users size={14} color="#6b7280" />
              <Text style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginLeft: 4 
              }}>
                {onlineClass.student_names.length} students
              </Text>
            </View>
          </View>

          {/* Meeting Password - only show if class can be joined */}
          {onlineClass.meeting_password && canJoinClass(onlineClass) && (
            <View style={{ 
              backgroundColor: '#f9fafb', 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 12 
            }}>
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: 4 
              }}>
                Meeting Password:
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#111827', 
                fontFamily: 'monospace' 
              }}>
                {onlineClass.meeting_password}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleJoinClass(onlineClass)}
              disabled={!canJoinClass(onlineClass)}
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isLive 
                  ? '#ef4444' 
                  : !canJoinClass(onlineClass)
                  ? '#d1d5db'
                  : '#3b82f6'
              }}
            >
              {isLive ? (
                <Play size={16} color="white" />
              ) : (
                <Video size={16} color={!canJoinClass(onlineClass) ? '#6b7280' : 'white'} />
              )}
              <Text style={{
                marginLeft: 8,
                fontWeight: '600',
                color: !canJoinClass(onlineClass) ? '#6b7280' : 'white'
              }}>
                {isLive ? 'Join Live' : !canJoinClass(onlineClass) ? 'Cannot Join Yet' : 'Join Class'}
              </Text>
            </TouchableOpacity>
            
            {onlineClass.meeting_link && (
              <TouchableOpacity
                onPress={() => Linking.openURL(onlineClass.meeting_link)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8
                }}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb' 
      }}>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: 'bold', 
          color: '#111827', 
          marginBottom: 12 
        }}>
          Online Classes
        </Text>
        
        {/* Child Selector */}
        {children.length > 1 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: 8 
            }}>
              Select Child:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  style={{
                    marginRight: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: selectedChild === child.id ? '#3b82f6' : '#f3f4f6'
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: selectedChild === child.id ? 'white' : '#374151'
                  }}>
                    {child.full_name}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: selectedChild === child.id ? '#dbeafe' : '#6b7280'
                  }}>
                    Grade {child.grade} {child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: '#f3f4f6', 
          borderRadius: 8, 
          padding: 4 
        }}>
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' },
            { key: 'all', label: 'All' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedFilter(tab.key as any)}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: selectedFilter === tab.key ? 'white' : 'transparent'
              }}
            >
              <Text style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: selectedFilter === tab.key ? '#111827' : '#6b7280'
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingVertical: 16 }}>
          {filteredClasses.length === 0 ? (
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center', 
              paddingVertical: 80 
            }}>
              <Video size={48} color="#9ca3af" />
              <Text style={{ 
                color: '#6b7280', 
                textAlign: 'center', 
                marginTop: 16,
                fontSize: 16
              }}>
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