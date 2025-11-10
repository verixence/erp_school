import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Dimensions,
  StyleSheet,
  Animated
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
  PenTool,
  MessageSquare,
  Search,
  ChevronRight,
  Star,
  Video,
  Camera,
  UserX,
  Send,
  Sparkles,
  Heart,
  HelpCircle,
  GraduationCap,
  CheckCircle,
  FileEdit,
  ClipboardCheck,
  Megaphone,
  ImageIcon,
  Receipt,
  Wallet
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { schoolTheme } from '../../theme/schoolTheme';
import { StatCardSkeleton, ActionCardSkeleton, ListItemSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ImportantAlerts } from '../../components/dashboard/ImportantAlerts';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { AccountMenu } from '../../components/modals/AccountMenu';

const { width } = Dimensions.get('window');

interface TeacherStats {
  totalStudents: number;
  assignedSections: number;
  classTeacherSections: number;
  upcomingExams: number;
  pendingReports: number;
  upcomingHomework: number;
  lastUpdated: Date;
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
  const [showStatHelp, setShowStatHelp] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);

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
  const upcomingExams = examPapers.filter(paper =>
    paper.exam_date && new Date(paper.exam_date) > new Date()
  ).length;

  const pendingMarksPapers = examPapers.filter(paper => {
    const isPastExam = paper.exam_date && new Date(paper.exam_date) <= new Date();
    return isPastExam;
  }).slice(0, 5);

  const stats: TeacherStats = {
    totalStudents,
    assignedSections: teacherSections.length,
    classTeacherSections: classTeacherSections.length,
    upcomingExams,
    pendingReports: 0,
    upcomingHomework: 0,
    lastUpdated: new Date(),
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSections()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleButtonPress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  // Quick Actions - Modern vibrant colors
  const primaryActions = [
    {
      title: "Take Attendance",
      subtitle: "Mark who's here today",
      icon: CheckCircle,
      color: '#10B981', // Emerald green
      lightBg: '#D1FAE5',
      onPress: () => (navigation as any).navigate('AttendanceTab', { screen: 'Attendance' })
    },
    {
      title: "Enter Marks",
      subtitle: "Update test scores",
      icon: FileEdit,
      color: '#F59E0B', // Amber
      lightBg: '#FEF3C7',
      badge: pendingMarksPapers.length > 0 ? pendingMarksPapers.length : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Marks' })
    },
    {
      title: "My Timetable",
      subtitle: "Today's schedule",
      icon: Calendar,
      color: '#3B82F6', // Blue
      lightBg: '#DBEAFE',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Community",
      subtitle: "Connect with others",
      icon: MessageSquare,
      color: '#8B5CF6', // Purple
      lightBg: '#EDE9FE',
      onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Community' })
    }
  ];

  // Organized by categories for better UX
  const categorizedTools = {
    academic: {
      title: "📚 Academic",
      color: '#4F46E5',
      items: [
        {
          title: "Homework",
          icon: BookOpen,
          color: schoolTheme.quickActions.homework.color,
          lightBg: schoolTheme.quickActions.homework.lightBg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
        },
        {
          title: "Exams",
          icon: Award,
          color: schoolTheme.quickActions.exams.color,
          lightBg: schoolTheme.quickActions.exams.lightBg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
        },
        {
          title: "Analytics",
          icon: Sparkles,
          color: schoolTheme.colors.info.main,
          lightBg: schoolTheme.colors.info.bg,
          onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Analytics' })
        },
        {
          title: "Online Classes",
          icon: Video,
          color: schoolTheme.quickActions.onlineClasses.color,
          lightBg: schoolTheme.quickActions.onlineClasses.lightBg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'OnlineClasses' })
        },
      ]
    },
    administrative: {
      title: "💼 Administrative",
      color: '#7C3AED',
      items: [
        {
          title: "Leave Requests",
          icon: ClipboardCheck,
          color: schoolTheme.colors.warning.main,
          lightBg: schoolTheme.colors.warning.bg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'LeaveRequests' })
        },
        {
          title: "Expense Claims",
          icon: Receipt,
          color: '#10b981',
          lightBg: '#d1fae5',
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'ExpenseClaims' })
        },
        {
          title: "Payslips",
          icon: Wallet,
          color: '#8b5cf6',
          lightBg: '#ede9fe',
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Payslips' })
        },
      ]
    },
    communication: {
      title: "💬 Communication",
      color: '#14B8A6',
      items: [
        {
          title: "Announcements",
          icon: Megaphone,
          color: schoolTheme.quickActions.announcements.color,
          lightBg: schoolTheme.quickActions.announcements.lightBg,
          onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Announcements' })
        },
        {
          title: "Calendar",
          icon: Calendar,
          color: schoolTheme.quickActions.calendar?.color || schoolTheme.colors.primary.main,
          lightBg: schoolTheme.quickActions.calendar?.lightBg || schoolTheme.colors.secondary.light,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Calendar' })
        },
        {
          title: "Gallery",
          icon: ImageIcon,
          color: schoolTheme.colors.parent.main,
          lightBg: schoolTheme.colors.parent.lightBg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Gallery' })
        },
      ]
    }
  };

  // Recent Activities - teacher specific
  const recentActivities = [
    {
      id: '1',
      type: 'attendance' as const,
      title: 'Attendance Marked',
      description: `Marked attendance for ${teacherSections.length > 0 ? teacherSections.length : 0} section${teacherSections.length !== 1 ? 's' : ''}`,
      time: 'Today',
    },
    {
      id: '2',
      type: 'homework' as const,
      title: 'Homework Assigned',
      description: 'Mathematics assignment posted for Grade 10',
      time: '2 hours ago',
    },
    {
      id: '3',
      type: 'exam' as const,
      title: 'Marks Entry',
      description: 'Entered marks for Science test',
      time: 'Yesterday',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
      {/* Colorful Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => handleButtonPress(() => setShowAccountMenu(true))}>
              <View style={styles.avatarContainer}>
                <GraduationCap size={32} color="white" />
              </View>
            </TouchableOpacity>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {user?.first_name}!
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards with Help Icons - Larger sizing */}
        {sectionsLoading || studentsLoading ? (
          <View style={styles.statsContainer}>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'students' ? null : 'students'))}
            >
              <View style={styles.statHeader}>
                <Users size={26} color="rgba(255,255,255,0.95)" />
                <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statNumber}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
              {showStatHelp === 'students' && (
                <Text style={styles.statHelpText}>Total students in all your sections</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'classes' ? null : 'classes'))}
            >
              <View style={styles.statHeader}>
                <BookOpen size={26} color="rgba(255,255,255,0.95)" />
                <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statNumber}>{stats.assignedSections}</Text>
              <Text style={styles.statLabel}>Classes</Text>
              {showStatHelp === 'classes' && (
                <Text style={styles.statHelpText}>Classes you teach</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'exams' ? null : 'exams'))}
            >
              <View style={styles.statHeader}>
                <PenTool size={26} color="rgba(255,255,255,0.95)" />
                <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statNumber}>{stats.upcomingExams}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
              {showStatHelp === 'exams' && (
                <Text style={styles.statHelpText}>Exams scheduled ahead</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'class_teacher' ? null : 'class_teacher'))}
            >
              <View style={styles.statHeader}>
                <Star size={26} color="rgba(255,255,255,0.95)" />
                <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statNumber}>{stats.classTeacherSections}</Text>
              <Text style={styles.statLabel}>Class Teacher</Text>
              {showStatHelp === 'class_teacher' && (
                <Text style={styles.statHelpText}>Classes where you're the class teacher</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>
          Updated {stats.lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </LinearGradient>
        {/* Important Alerts Section */}
        <ImportantAlerts
          alerts={[
            ...(pendingMarksPapers.length > 0
              ? [
                  {
                    id: 'pending-marks',
                    type: 'warning' as const,
                    title: 'Pending Marks Entry',
                    message: `You have ${pendingMarksPapers.length} exam${pendingMarksPapers.length > 1 ? 's' : ''} waiting for marks entry.`,
                    action: () => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Marks' })),
                    actionLabel: 'Enter Marks',
                  },
                ]
              : []),
            ...(stats.upcomingExams > 3
              ? [
                  {
                    id: 'upcoming-exams',
                    type: 'info' as const,
                    title: 'Upcoming Exams',
                    message: `You have ${stats.upcomingExams} exams scheduled in the coming weeks.`,
                    action: () => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })),
                    actionLabel: 'View Schedule',
                  },
                ]
              : []),
          ].slice(0, 3)}
        />

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          {sectionsLoading ? (
            <View style={styles.primaryGrid}>
              <ActionCardSkeleton />
              <ActionCardSkeleton />
              <ActionCardSkeleton />
              <ActionCardSkeleton />
            </View>
          ) : (
            <View style={styles.primaryGrid}>
              {primaryActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.primaryCard, { backgroundColor: action.color }]}
                    onPress={() => handleButtonPress(action.onPress)}
                    activeOpacity={0.7}
                  >
                    {action.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{action.badge}</Text>
                      </View>
                    )}
                    <View style={styles.primaryCardContent}>
                      <View style={styles.primaryIconContainer}>
                        <IconComponent size={28} color="white" />
                      </View>
                      <Text style={styles.primaryCardTitle}>{action.title}</Text>
                      <Text style={styles.primaryCardSubtitle}>{action.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <RecentActivity activities={recentActivities} />

        {/* Categorized Tools - Better Organization */}
        {Object.entries(categorizedTools).map(([key, category]) => (
          <View key={key} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: category.color }]}>
                  {category.items.length}
                </Text>
              </View>
            </View>
            <View style={styles.categoryGrid}>
              {category.items.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryCard}
                    onPress={() => handleButtonPress(action.onPress)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[action.lightBg, 'white']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.categoryCardGradient}
                    >
                      <View style={[styles.categoryIconWrapper, { backgroundColor: action.color + '15' }]}>
                        <IconComponent size={24} color={action.color} strokeWidth={2.5} />
                      </View>
                      <Text style={styles.categoryCardTitle}>{action.title}</Text>
                      <View style={[styles.categoryCardArrow, { backgroundColor: action.color + '10' }]}>
                        <ChevronRight size={14} color={action.color} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Pending Tasks */}
        {examsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Tasks</Text>
            <ListItemSkeleton />
            <ListItemSkeleton />
          </View>
        ) : pendingMarksPapers.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Tasks</Text>
              <View style={styles.urgentBadge}>
                <Sparkles size={12} color="#92400e" />
                <Text style={styles.urgentBadgeText}>Action Needed</Text>
              </View>
            </View>
            <View style={styles.pendingContainer}>
              {pendingMarksPapers.map((paper, index) => (
                <TouchableOpacity
                  key={paper.id}
                  style={styles.pendingCard}
                  onPress={() => handleButtonPress(() => {
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
                  })}
                >
                  <View style={styles.pendingIconContainer}>
                    <FileEdit size={24} color={schoolTheme.colors.warning.main} />
                  </View>
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>Enter Marks - {paper.subject}</Text>
                    <Text style={styles.pendingSubtitle}>
                      Max: {paper.max_marks} marks • {paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={schoolTheme.colors.warning.main} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* My Classes */}
        {sectionsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Classes</Text>
            <View style={styles.sectionsGrid}>
              <ActionCardSkeleton />
              <ActionCardSkeleton />
            </View>
          </View>
        ) : teacherSections.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Classes</Text>
            <View style={styles.sectionsGrid}>
              {teacherSections.slice(0, 4).map((section, idx) => {
                const cardColors = [
                  { bg: '#DBEAFE', text: '#1E40AF' },
                  { bg: '#D1FAE5', text: '#065F46' },
                  { bg: '#FEF3C7', text: '#92400E' },
                  { bg: '#FCE7F3', text: '#831843' },
                ];
                const colorSet = cardColors[idx % 4];
                const isClassTeacher = section.class_teacher === user?.id;

                return (
                  <View key={section.id} style={[styles.sectionCard, { backgroundColor: colorSet.bg }]}>
                    <View style={styles.sectionCardHeader}>
                      <Text style={[styles.sectionGrade, { color: colorSet.text }]}>
                        Grade {section.grade}{section.section}
                      </Text>
                      {isClassTeacher && (
                        <View style={styles.classTeacherBadge}>
                          <Star size={14} color="#fbbf24" fill="#fbbf24" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sectionRole, { color: colorSet.text }]}>
                      {isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                    </Text>
                    <View style={styles.sectionActions}>
                      <TouchableOpacity
                        style={[styles.sectionActionBtn, { backgroundColor: schoolTheme.colors.attendance }]}
                        onPress={() => handleButtonPress(() => (navigation as any).navigate('AttendanceTab'))}
                      >
                        <Users size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sectionActionBtn, { backgroundColor: schoolTheme.colors.timetable }]}
                        onPress={() => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' }))}
                      >
                        <Calendar size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <EmptyState
              icon="book"
              title="No Classes Assigned"
              message="You don't have any classes assigned yet. Please contact your administrator."
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Account Menu Modal */}
      <AccountMenu
        visible={showAccountMenu}
        onClose={() => setShowAccountMenu(false)}
        onNavigateToTheme={() => {
          setShowAccountMenu(false);
          (navigation as any).navigate('DashboardTab', { screen: 'ThemeSettings' });
        }}
        onNavigateToNotifications={() => {
          setShowAccountMenu(false);
          (navigation as any).navigate('SettingsTab', { screen: 'Settings' });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
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
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  userName: {
    color: 'white',
    fontSize: 26,
    fontFamily: schoolTheme.typography.fonts.bold,
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
    padding: 14,
    alignItems: 'center',
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    marginTop: 3,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  statHelpText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  lastUpdated: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  section: {
    marginBottom: 28,
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
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  primaryCard: {
    width: (width - 56) / 2,
    height: 180,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryCardTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontFamily: schoolTheme.typography.fonts.medium,
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
    fontFamily: schoolTheme.typography.fonts.bold,
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
  secondaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryCardTitle: {
    fontSize: 13,
    fontFamily: schoolTheme.typography.fonts.bold,
    textAlign: 'center',
  },
  // Category Section Styles
  categorySection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...schoolTheme.shadows.md,
    marginBottom: 8,
  },
  categoryCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryCardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  categoryCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: schoolTheme.colors.teacher.main + '10',
    borderWidth: 1,
    borderColor: schoolTheme.colors.teacher.main + '30',
  },
  seeAllText: {
    fontSize: 15,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.teacher.main,
    marginRight: 4,
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
    fontFamily: schoolTheme.typography.fonts.bold,
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
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
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
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  classTeacherBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRole: {
    fontSize: 13,
    fontFamily: schoolTheme.typography.fonts.semibold,
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
});
