import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StyleSheet,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  PenTool,
  MessageSquare,
  Bell,
  Search,
  ChevronRight,
  Star,
  Video,
  Camera,
  UserX,
  Send,
  Sparkles,
  Heart
} from 'lucide-react-native';
import { schoolTheme } from '../../theme/schoolTheme';

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

export const TeacherDashboardScreen: React.FC = () => {
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

  // Get total students count across all sections
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

  // Calculate statistics
  const completedExams = examPapers.filter(paper =>
    paper.exam_date && new Date(paper.exam_date) <= new Date()
  ).length;

  const pendingMarksPapers = examPapers.filter(paper => {
    const isPastExam = paper.exam_date && new Date(paper.exam_date) <= new Date();
    return isPastExam;
  }).slice(0, 5);

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
    await Promise.all([refetchSections()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  // School-Friendly Quick Actions with emojis!
  const primaryActions = [
    {
      title: "Take Attendance",
      subtitle: "Mark who's here today! ✓",
      icon: Users,
      emoji: "✅",
      color: schoolTheme.quickActions.attendance.color,
      gradient: schoolTheme.quickActions.attendance.gradient,
      lightBg: schoolTheme.quickActions.attendance.lightBg,
      onPress: () => (navigation as any).navigate('AttendanceTab', { screen: 'Attendance' })
    },
    {
      title: "Enter Marks",
      subtitle: "Update test scores ⭐",
      icon: PenTool,
      emoji: "📝",
      color: schoolTheme.quickActions.marks.color,
      gradient: schoolTheme.quickActions.marks.gradient,
      lightBg: schoolTheme.quickActions.marks.lightBg,
      badge: pendingMarksPapers.length > 0 ? pendingMarksPapers.length : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Marks' })
    },
    {
      title: "My Timetable",
      subtitle: "Today's classes 📅",
      icon: Calendar,
      emoji: "🕐",
      color: schoolTheme.quickActions.timetable.color,
      gradient: schoolTheme.quickActions.timetable.gradient,
      lightBg: schoolTheme.quickActions.timetable.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Community",
      subtitle: "Chat & connect 💬",
      icon: MessageSquare,
      emoji: "💬",
      color: schoolTheme.quickActions.community.color,
      gradient: schoolTheme.quickActions.community.gradient,
      lightBg: schoolTheme.quickActions.community.lightBg,
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Community' })
    }
  ];

  const secondaryActions = [
    {
      title: "Homework",
      icon: BookOpen,
      emoji: "📚",
      color: schoolTheme.quickActions.homework.color,
      lightBg: schoolTheme.quickActions.homework.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: "Exams",
      icon: Award,
      emoji: "🏆",
      color: schoolTheme.quickActions.exams.color,
      lightBg: schoolTheme.quickActions.exams.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
    },
    {
      title: "Online Classes",
      icon: Video,
      emoji: "🎥",
      color: schoolTheme.quickActions.onlineClasses.color,
      lightBg: schoolTheme.quickActions.onlineClasses.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'OnlineClasses' })
    },
    {
      title: "Leave Requests",
      icon: UserX,
      emoji: "📋",
      color: schoolTheme.colors.warning.main,
      lightBg: schoolTheme.colors.warning.bg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'LeaveRequests' })
    },
    {
      title: "Announcements",
      icon: Send,
      emoji: "📢",
      color: schoolTheme.quickActions.announcements.color,
      lightBg: schoolTheme.quickActions.announcements.lightBg,
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Announcements' })
    },
    {
      title: "Gallery",
      icon: Camera,
      emoji: "📸",
      color: schoolTheme.quickActions.gallery.color,
      lightBg: schoolTheme.quickActions.gallery.lightBg,
      onPress: () => (navigation as any).navigate('GalleryTab')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Fun Colorful Header */}
      <LinearGradient
        colors={schoolTheme.colors.teacher.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>👨‍🏫</Text>
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {user?.first_name}! 🎉
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Bell size={22} color="white" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Colorful Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.statEmoji}>📚</Text>
            <Text style={styles.statNumber}>{stats.assignedSections}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.statEmoji}>📝</Text>
            <Text style={styles.statNumber}>{stats.completedExams}</Text>
            <Text style={styles.statLabel}>Exams</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.statEmoji}>⭐</Text>
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
        {/* Quick Actions - Big & Colorful! */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ Quick Actions</Text>
          </View>
          <View style={styles.primaryGrid}>
            {primaryActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.primaryCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={action.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryCardGradient}
                >
                  {action.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{action.badge}</Text>
                    </View>
                  )}
                  <View style={styles.primaryCardContent}>
                    <Text style={styles.primaryEmoji}>{action.emoji}</Text>
                    <Text style={styles.primaryCardTitle}>{action.title}</Text>
                    <Text style={styles.primaryCardSubtitle}>{action.subtitle}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* More Features - Colorful Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 More Tools</Text>
          <View style={styles.secondaryGrid}>
            {secondaryActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.secondaryCard, { backgroundColor: action.lightBg }]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryEmoji}>{action.emoji}</Text>
                <Text style={[styles.secondaryCardTitle, { color: action.color }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Actions - Fun Alert Style */}
        {pendingMarksPapers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Pending Tasks</Text>
              <View style={styles.urgentBadge}>
                <Sparkles size={12} color="#92400e" />
                <Text style={styles.urgentBadgeText}>Action Needed!</Text>
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
                    <Text style={styles.pendingEmoji}>📝</Text>
                  </View>
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>Enter Marks - {paper.subject}</Text>
                    <Text style={styles.pendingSubtitle}>
                      🎯 Max: {paper.max_marks} marks • {paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={schoolTheme.colors.warning.main} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* My Classes - Colorful Cards */}
        {teacherSections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 My Classes</Text>
            <View style={styles.sectionsGrid}>
              {teacherSections.slice(0, 4).map((section, idx) => {
                const cardColors = [
                  { bg: '#DBEAFE', text: '#1E40AF' },
                  { bg: '#D1FAE5', text: '#065F46' },
                  { bg: '#FEF3C7', text: '#92400E' },
                  { bg: '#FCE7F3', text: '#831843' },
                ];
                const colorSet = cardColors[idx % 4];

                return (
                  <View key={section.id} style={[styles.sectionCard, { backgroundColor: colorSet.bg }]}>
                    <View style={styles.sectionCardHeader}>
                      <Text style={[styles.sectionGrade, { color: colorSet.text }]}>
                        Grade {section.grade}{section.section}
                      </Text>
                      {section.class_teacher === user?.id && (
                        <Text style={styles.classTeacherEmoji}>⭐</Text>
                      )}
                    </View>
                    <Text style={[styles.sectionRole, { color: colorSet.text }]}>
                      {section.class_teacher === user?.id ? '👨‍🏫 Class Teacher' : '📚 Subject Teacher'}
                    </Text>
                    <View style={styles.sectionActions}>
                      <TouchableOpacity
                        style={[styles.sectionActionBtn, { backgroundColor: schoolTheme.colors.attendance }]}
                        onPress={() => (navigation as any).navigate('AttendanceTab')}
                      >
                        <Text style={styles.actionBtnEmoji}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sectionActionBtn, { backgroundColor: schoolTheme.colors.timetable }]}
                        onPress={() => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })}
                      >
                        <Text style={styles.actionBtnEmoji}>📅</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: schoolTheme.colors.background.main,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statNumber: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: schoolTheme.colors.text.primary,
  },
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  primaryCard: {
    width: (width - 56) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    ...schoolTheme.shadows.md,
  },
  primaryCardGradient: {
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
  },
  primaryCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  primaryCardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: 'white',
    ...schoolTheme.shadows.sm,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  secondaryCard: {
    width: (width - 64) / 3,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    ...schoolTheme.shadows.sm,
  },
  secondaryEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  secondaryCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  urgentBadge: {
    backgroundColor: schoolTheme.colors.warning.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: schoolTheme.colors.warning.main,
  },
  urgentBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingContainer: {
    gap: 12,
  },
  pendingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    borderLeftColor: schoolTheme.colors.warning.main,
    ...schoolTheme.shadows.md,
  },
  pendingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: schoolTheme.colors.warning.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingEmoji: {
    fontSize: 24,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: schoolTheme.colors.text.primary,
    marginBottom: 4,
  },
  pendingSubtitle: {
    fontSize: 13,
    color: schoolTheme.colors.text.secondary,
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    ...schoolTheme.shadows.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionGrade: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  classTeacherEmoji: {
    fontSize: 20,
  },
  sectionRole: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...schoolTheme.shadows.sm,
  },
  actionBtnEmoji: {
    fontSize: 16,
    color: 'white',
  },
});
