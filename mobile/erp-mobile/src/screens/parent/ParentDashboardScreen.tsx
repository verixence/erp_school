import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Award,
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Bell,
  Download,
  Eye,
  Target,
  Zap,
  Heart,
  ChevronRight,
  Video,
  Send,
  Search,
  Home,
  PenTool,
  UserX,
  Camera
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  gender?: string;
  section_id: string;
  sections?: {
    id: string;
    grade: number;
    section: string;
  };
}

interface ParentStats {
  childrenCount: number;
  upcomingHomework: number;
  attendancePercentage: number;
  lastActivity: string;
  totalExams: number;
  averageGrade: string;
}

// Simple Progress Circle Component
const ProgressCircle: React.FC<{ percentage: number; size: number; color: string }> = ({ 
  percentage, 
  size, 
  color 
}) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ 
          fontSize: size * 0.25, 
          fontWeight: 'bold', 
          color: color 
        }}>
          {percentage}%
        </Text>
      </View>
      <View style={{
        position: 'absolute',
        top: 2,
        left: 2,
        width: size - 4,
        height: size - 4,
        borderRadius: (size - 4) / 2,
        borderWidth: 3,
        borderColor: color + '30',
        borderTopColor: color,
        transform: [{ rotate: `${(percentage / 100) * 360}deg` }]
      }} />
    </View>
  );
};

export const ParentDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch children using the correct student_parents table relationship
  const { data: children = [], isLoading: childrenLoading, refetch: refetchChildren } = useQuery({
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
            gender,
            section_id,
            sections!inner(
              id,
              grade,
              section
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('students.school_id', user.school_id);

      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        gender: item.students.gender,
        section_id: item.students.section_id,
        sections: item.students.sections
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Set default selected child when children load
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children.length, selectedChild]); // Use children.length instead of children array

  // Fetch parent dashboard stats with enhanced data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['parent-stats', user?.id, selectedChild],
    queryFn: async (): Promise<ParentStats> => {
      if (!user?.id) return {
        childrenCount: 0,
        upcomingHomework: 0,
        attendancePercentage: 0,
        lastActivity: 'Never',
        totalExams: 0,
        averageGrade: 'N/A'
      };

      const childrenCount = children.length;
      const studentIds = selectedChild ? [selectedChild] : children.map(c => c.id);
      
      let upcomingHomework = 0;
      let attendancePercentage = 0;
      let totalExams = 0;
      let averageGrade = 'N/A';

      if (studentIds.length > 0) {
        // Get upcoming homework count
        const { data: homeworkData } = await supabase
          .from('homework')
          .select('id')
          .in('section_id', children.map(c => c.section_id))
          .gte('due_date', new Date().toISOString().split('T')[0])
          .eq('school_id', user.school_id);

        upcomingHomework = homeworkData?.length || 0;

        // Calculate attendance percentage for current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('status')
          .in('student_id', studentIds)
          .gte('date', currentMonth + '-01')
          .lt('date', currentMonth + '-32')
          .eq('school_id', user.school_id);

        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.status === 'present').length;
          attendancePercentage = Math.round((presentCount / attendanceData.length) * 100);
        }

        // Get exam data
        const { data: examData } = await supabase
          .from('marks')
          .select('marks_obtained, max_marks')
          .in('student_id', studentIds)
          .eq('school_id', user.school_id);

        if (examData && examData.length > 0) {
          totalExams = examData.length;
          const totalMarks = examData.reduce((sum, exam) => sum + exam.marks_obtained, 0);
          const totalMaxMarks = examData.reduce((sum, exam) => sum + exam.max_marks, 0);
          if (totalMaxMarks > 0) {
            averageGrade = `${Math.round((totalMarks / totalMaxMarks) * 100)}%`;
          }
        }
      }

      return {
        childrenCount,
        upcomingHomework,
        attendancePercentage,
        lastActivity: 'Today',
        totalExams,
        averageGrade
      };
    },
    enabled: !!user?.id && children.length > 0,
    staleTime: 1000 * 60 * 2, // Consider stats fresh for 2 minutes
  });

  const currentChild = children.find(child => child.id === selectedChild);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchChildren();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const statsData = stats || {
    childrenCount: children.length,
    upcomingHomework: 0,
    attendancePercentage: 0,
    lastActivity: 'Today',
    totalExams: 0,
    averageGrade: 'N/A'
  };

  // Quick Actions with better organization
  const primaryActions = [
    {
      title: "View Attendance",
      subtitle: "Daily attendance records",
      icon: Users,
      color: "#3b82f6",
      gradient: ["#3b82f6", "#1d4ed8"],
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' })
    },
    {
      title: "Check Homework",
      subtitle: "Assignments & submissions",
      icon: BookOpen,
      color: "#10b981",
      gradient: ["#10b981", "#059669"],
      badge: statsData.upcomingHomework > 0 ? statsData.upcomingHomework : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: "Class Timetable",
      subtitle: "View class schedule",
      icon: Calendar,
      color: "#f59e0b",
      gradient: ["#f59e0b", "#d97706"],
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Community",
      subtitle: "Connect & share",
      icon: MessageSquare,
      color: "#8b5cf6",
      gradient: ["#8b5cf6", "#7c3aed"],
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Community' })
    }
  ];

  const secondaryActions = [
    {
      title: "Exam Results",
      icon: Award,
      color: "#ef4444",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
    },
    {
      title: "Reports",
      icon: FileText,
      color: "#06b6d4",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Reports' })
    },
    {
      title: "Online Classes",
      icon: Video,
      color: "#84cc16",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'OnlineClasses' })
    },
    {
      title: "Announcements",
      icon: Send,
      color: "#f97316",
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Announcements' })
    },
    {
      title: "Gallery",
      icon: Camera,
      color: "#84cc16",
      onPress: () => (navigation as any).navigate('MediaTab', { screen: 'Gallery' })
    },
    {
      title: "Calendar",
      icon: Calendar,
      color: "#06b6d4",
      onPress: () => (navigation as any).navigate('MediaTab', { screen: 'Calendar' })
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={['#8b5cf6', '#a855f7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.first_name?.charAt(0) || 'P'}
              </Text>
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {getGreeting()}
              </Text>
              <Text style={styles.userName}>
                {user?.first_name}!
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Bell size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Search size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Child Selector */}
        {children.length > 1 && (
          <View style={styles.childSelector}>
            <Text style={styles.childSelectorLabel}>
              Select Child
            </Text>
            <TouchableOpacity
              style={styles.childSelectorButton}
              onPress={() => console.log('Open child selector')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GraduationCap size={20} color="white" />
                <Text style={styles.childSelectorText}>
                  {currentChild ? `${currentChild.full_name} - Grade ${currentChild.sections?.grade}` : 'Select a child'}
                </Text>
              </View>
              <ChevronDown size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Cards in Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statsData.childrenCount}</Text>
            <Text style={styles.statLabel}>Children</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statsData.attendancePercentage}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statsData.upcomingHomework}</Text>
            <Text style={styles.statLabel}>Homework</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statsData.averageGrade}</Text>
            <Text style={styles.statLabel}>Avg Grade</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary Actions Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.primaryGrid}>
            {primaryActions.map((action, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.primaryCard}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryCardGradient}
                >
                  <View style={styles.primaryCardContent}>
                    <View style={styles.primaryIconContainer}>
                      <action.icon size={24} color="white" />
                    </View>
                    <Text style={styles.primaryCardTitle}>{action.title}</Text>
                    <Text style={styles.primaryCardSubtitle}>{action.subtitle}</Text>
                    {action.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{action.badge}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Secondary Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Features</Text>
          <View style={styles.secondaryGrid}>
            {secondaryActions.map((action, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.secondaryCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.secondaryIconContainer, { backgroundColor: action.color + '15' }]}>
                  <action.icon size={20} color={action.color} />
                </View>
                <Text style={styles.secondaryCardTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current Child Info Enhanced - Only if children exist */}
        {currentChild && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {children.length > 1 ? 'Selected Child' : 'Child Profile'}
            </Text>
            <View style={styles.childCard}>
              <View style={styles.childCardHeader}>
                <Text style={styles.childGrade}>Grade {currentChild.sections?.grade}{currentChild.sections?.section}</Text>
                <View style={styles.activeBadge}>
                  <Star size={10} color="#fbbf24" />
                </View>
              </View>
              <Text style={styles.childName}>{currentChild.full_name}</Text>
              <Text style={styles.childDetails}>
                Admission: {currentChild.admission_no || 'N/A'}
              </Text>
              <View style={styles.childActions}>
                <TouchableOpacity 
                  style={[styles.childActionBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={() => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' })}
                >
                  <Users size={12} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.childActionBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })}
                >
                  <Calendar size={12} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.childActionBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })}
                >
                  <BookOpen size={12} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* No Children State */}
        {!childrenLoading && children.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyStateCard}>
              <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyStateTitle}>No Children Found</Text>
              <Text style={styles.emptyStateText}>
                No children are currently linked to your account. Please contact the school administration to link your children's records.
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  childSelector: {
    marginTop: 16,
  },
  childSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  childSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  childSelectorText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionLink: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryCardGradient: {
    padding: 20,
    height: 140,
    justifyContent: 'space-between',
  },
  primaryCardContent: {
    flex: 1,
  },
  primaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryCardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  secondaryCard: {
    width: (width - 64) / 3,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  childCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  childGrade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  activeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  childActions: {
    flexDirection: 'row',
    gap: 8,
  },
  childActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
