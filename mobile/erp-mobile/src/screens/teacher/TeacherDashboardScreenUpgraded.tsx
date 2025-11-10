import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  SafeAreaView,
  Dimensions,
  StyleSheet
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Award, 
  CheckCircle, 
  Clock, 
  GraduationCap,
  PenTool,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  FileText,
  UserCheck,
  Target,
  Zap,
  BarChart3,
  Bell,
  Search,
  Settings,
  ChevronRight,
  Star,
  Activity,
  Video,
  Camera,
  UserX,
  Send
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface TeacherStats {
  totalStudents: number;
  assignedSections: number;
  classTeacherSections: number;
  completedExams: number;
  pendingReports: number;
  upcomingHomework: number;
}

interface Section {
  id: string;
  grade: number;
  section: string;
  school_id: string;
  class_teacher?: string;
}

interface ExamPaper {
  id: string;
  subject: string;
  exam_date: string;
  exam_time: string;
  duration_minutes: number;
  max_marks: number;
}

export const TeacherDashboardScreenUpgraded: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch teacher's assigned sections
  const { data: teacherSections = [], isLoading: sectionsLoading, refetch: refetchSections } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id,
            class_teacher
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        school_id: item.sections.school_id,
        class_teacher: item.sections.class_teacher
      }));
    },
    enabled: !!user?.id,
  });

  // Get total students count
  const { data: totalStudents = 0, isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher-total-students', user?.id, teacherSections],
    queryFn: async (): Promise<number> => {
      if (!user?.id || teacherSections.length === 0) return 0;
      
      const sectionIds = teacherSections.map(s => s.id);
      const { data, error } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .in('section_id', sectionIds);
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id && teacherSections.length > 0,
  });

  // Get class teacher sections
  const { data: classTeacherSections = [], isLoading: classTeacherLoading } = useQuery({
    queryKey: ['class-teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('sections')
        .select('id, grade, section, school_id, class_teacher')
        .eq('class_teacher', user.id)
        .eq('school_id', user.school_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get exam papers
  const { data: examPapers = [], isLoading: examsLoading } = useQuery({
    queryKey: ['teacher-exam-papers', user?.id],
    queryFn: async (): Promise<ExamPaper[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          id,
          subject,
          exam_date,
          exam_time,
          duration_minutes,
          max_marks,
          teachers!inner(
            user_id
          )
        `)
        .eq('school_id', user.school_id)
        .eq('teachers.user_id', user.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const completedExams = examPapers.filter(paper => 
    paper.exam_date && new Date(paper.exam_date) <= new Date()
  ).length;

  const pendingMarksPapers = examPapers.filter(paper => {
    const isPastExam = paper.exam_date && new Date(paper.exam_date) <= new Date();
    return isPastExam;
  }).slice(0, 3);

  const stats: TeacherStats = {
    totalStudents,
    assignedSections: teacherSections.length,
    classTeacherSections: classTeacherSections.length,
    completedExams,
    pendingReports: 0,
    upcomingHomework: 0,
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchSections();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Quick Actions with better organization
  const primaryActions = [
    {
      title: "Take Attendance",
      subtitle: "Mark student attendance",
      icon: Users,
      color: "#3b82f6",
      gradient: ["#3b82f6", "#1d4ed8"] as const,
      onPress: () => (navigation as any).navigate('AttendanceTab', { screen: 'Attendance' })
    },
    {
      title: "Enter Marks",
      subtitle: "Update exam marks",
      icon: PenTool,
      color: "#10b981",
      gradient: ["#10b981", "#059669"] as const,
      badge: pendingMarksPapers.length > 0 ? pendingMarksPapers.length : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Marks' })
    },
    {
      title: "My Timetable",
      subtitle: "View class schedule",
      icon: Calendar,
      color: "#f59e0b",
      gradient: ["#f59e0b", "#d97706"] as const,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Community",
      subtitle: "Connect & share",
      icon: MessageSquare,
      color: "#8b5cf6",
      gradient: ["#8b5cf6", "#7c3aed"] as const,
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Community' })
    }
  ];

  const secondaryActions = [
    {
      title: "Homework",
      icon: BookOpen,
      color: "#ef4444",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: "Exams",
      icon: Award,
      color: "#06b6d4",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
    },
    {
      title: "Online Classes",
      icon: Video,
      color: "#84cc16",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'OnlineClasses' })
    },
    {
      title: "Leave Requests",
      icon: UserX,
      color: "#f97316",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'LeaveRequests' })
    },
    {
      title: "Announcements",
      icon: Send,
      color: "#06b6d4",
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Announcements' })
    },
    {
      title: "Gallery",
      icon: Camera,
      color: "#84cc16",
      onPress: () => (navigation as any).navigate('GalleryTab')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={['#1e40af', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.first_name?.charAt(0) || 'T'}
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

        {/* Stats Cards in Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.assignedSections}</Text>
            <Text style={styles.statLabel}>Sections</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completedExams}</Text>
            <Text style={styles.statLabel}>Exams</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.classTeacherSections}</Text>
            <Text style={styles.statLabel}>Class Teacher</Text>
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

        {/* Pending Actions */}
        {pendingMarksPapers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Actions</Text>
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>Urgent</Text>
              </View>
            </View>
            <View style={styles.pendingContainer}>
              {pendingMarksPapers.map((paper, index) => (
                <TouchableOpacity
                  key={paper.id}
                  style={styles.pendingCard}
                  onPress={() => {
                    (navigation as any).navigate('AcademicsTab', { 
                      screen: 'Marks',
                      params: { 
                        examId: paper.id,
                        examDetails: {
                          id: paper.id,
                          exam_name: `${paper.subject} Exam`,
                          subject: paper.subject,
                          date: paper.exam_date,
                          max_marks: paper.max_marks,
                        }
                      }
                    });
                  }}
                >
                  <View style={styles.pendingIconContainer}>
                    <PenTool size={16} color="#f59e0b" />
                  </View>
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>Enter Marks - {paper.subject}</Text>
                    <Text style={styles.pendingSubtitle}>
                      Max: {paper.max_marks} marks • {paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#6b7280" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Class Sections */}
        {teacherSections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Sections</Text>
            <View style={styles.sectionsGrid}>
              {teacherSections.slice(0, 4).map((section) => (
                <View key={section.id} style={styles.sectionCard}>
                  <View style={styles.sectionCardHeader}>
                    <Text style={styles.sectionGrade}>Grade {section.grade}{section.section}</Text>
                    {section.class_teacher === user?.id && (
                      <View style={styles.classTeacherBadge}>
                        <Star size={10} color="#fbbf24" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.sectionRole}>
                    {section.class_teacher === user?.id ? 'Class Teacher' : 'Subject Teacher'}
                  </Text>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity 
                      style={[styles.sectionActionBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={() => (navigation as any).navigate('AttendanceTab')}
                    >
                      <Users size={12} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.sectionActionBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })}
                    >
                      <Calendar size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
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
    marginBottom: 20,
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
    color: '#3b82f6',
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
  urgentBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingContainer: {
    gap: 12,
  },
  pendingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  pendingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionCard: {
    width: (width - 52) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionGrade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  classTeacherBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRole: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});