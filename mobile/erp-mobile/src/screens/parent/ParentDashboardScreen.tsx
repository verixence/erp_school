import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Camera,
  DollarSign,
  HelpCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { schoolTheme } from '../../theme/schoolTheme';
import { StatCardSkeleton, ActionCardSkeleton, ListItemSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChildSelectorModal } from '../../components/modals/ChildSelectorModal';
import { AccountMenu } from '../../components/modals/AccountMenu';
import { ImportantAlerts } from '../../components/dashboard/ImportantAlerts';
import { RecentActivity } from '../../components/dashboard/RecentActivity';

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
  lastUpdated: Date;
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
  const [showChildSelector, setShowChildSelector] = useState(false);
  const [showStatHelp, setShowStatHelp] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

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
        averageGrade,
        lastUpdated: new Date()
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

  const handleButtonPress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const handleChildSelect = (childId: string) => {
    setSelectedChild(childId);
  };

  const statsData = stats || {
    childrenCount: children.length,
    upcomingHomework: 0,
    attendancePercentage: 0,
    lastActivity: 'Today',
    totalExams: 0,
    averageGrade: 'N/A',
    lastUpdated: new Date()
  };

  // Quick Actions - reduced emoji usage
  const primaryActions = [
    {
      title: "View Attendance",
      subtitle: "Track daily presence",
      icon: Users,
      emoji: "✅",
      color: schoolTheme.quickActions.attendance.color,
      gradient: schoolTheme.quickActions.attendance.gradient,
      lightBg: schoolTheme.quickActions.attendance.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' })
    },
    {
      title: "Check Homework",
      subtitle: "Assignments & tasks",
      icon: BookOpen,
      emoji: "📚",
      color: schoolTheme.quickActions.homework.color,
      gradient: schoolTheme.quickActions.homework.gradient,
      lightBg: schoolTheme.quickActions.homework.lightBg,
      badge: statsData.upcomingHomework > 0 ? statsData.upcomingHomework : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: "Exam Results",
      subtitle: "View test scores",
      icon: Award,
      emoji: "🏆",
      color: schoolTheme.quickActions.exams.color,
      gradient: schoolTheme.quickActions.exams.gradient,
      lightBg: schoolTheme.quickActions.exams.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
    },
    {
      title: "Community",
      subtitle: "Connect with others",
      icon: MessageSquare,
      emoji: "💬",
      color: schoolTheme.quickActions.community.color,
      gradient: schoolTheme.quickActions.community.gradient,
      lightBg: schoolTheme.quickActions.community.lightBg,
      onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Community' })
    }
  ];

  const secondaryActions = [
    {
      title: "Timetable",
      icon: Calendar,
      emoji: "📅",
      color: schoolTheme.quickActions.timetable.color,
      lightBg: schoolTheme.quickActions.timetable.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Analytics",
      icon: BarChart3,
      emoji: "📊",
      color: schoolTheme.colors.primary.main,
      lightBg: schoolTheme.colors.primary.bg,
      onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Analytics' })
    },
    {
      title: "Reports",
      icon: FileText,
      emoji: "📊",
      color: schoolTheme.quickActions.reports.color,
      lightBg: schoolTheme.quickActions.reports.lightBg,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Reports' })
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
      title: "Announcements",
      icon: Send,
      emoji: "📢",
      color: schoolTheme.quickActions.announcements.color,
      lightBg: schoolTheme.quickActions.announcements.lightBg,
      onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Announcements' })
    },
    {
      title: "Feedback",
      icon: MessageSquare,
      emoji: "💬",
      color: schoolTheme.colors.info.main,
      lightBg: schoolTheme.colors.info.bg,
      onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Feedback' })
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Child Selector Modal */}
      <ChildSelectorModal
        visible={showChildSelector}
        children={children}
        selectedChildId={selectedChild}
        onSelect={handleChildSelect}
        onClose={() => setShowChildSelector(false)}
      />

      {/* Colorful Header */}
      <LinearGradient
        colors={schoolTheme.colors.parent.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => handleButtonPress(() => setShowAccountMenu(true))}>
              <View style={styles.avatarContainer}>
                <Users size={32} color="white" />
              </View>
            </TouchableOpacity>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {getGreeting()}
              </Text>
              <Text style={styles.userName}>
                {user?.first_name}!
              </Text>
            </View>
          </View>
        </View>

        {/* Child Selector */}
        {children.length > 1 && (
          <View style={styles.childSelector}>
            <Text style={styles.childSelectorLabel}>
              Viewing
            </Text>
            <TouchableOpacity
              style={styles.childSelectorButton}
              onPress={() => handleButtonPress(() => setShowChildSelector(true))}
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

        {/* Stats Cards - 3 cards at 33% width each */}
        {childrenLoading || statsLoading ? (
          <View style={styles.statsContainer}>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'children' ? null : 'children'))}
            >
              <View style={styles.statHeader}>
                <GraduationCap size={26} color="rgba(255,255,255,0.95)" />
                <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statNumber}>{statsData.childrenCount}</Text>
              <Text style={styles.statLabel}>Children</Text>
              {showStatHelp === 'children' && (
                <Text style={styles.statHelpText}>Total children linked to your account</Text>
              )}
            </TouchableOpacity>
            <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <View style={styles.statWithProgress}>
                <ProgressCircle
                  percentage={statsData.attendancePercentage}
                  size={54}
                  color="white"
                />
              </View>
              <Text style={styles.statLabel}>Attendance</Text>
              <Text style={styles.statHelpText}>This month</Text>
            </View>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'homework' ? null : 'homework'))}
            >
              <View style={styles.statHeader}>
                <BookOpen size={26} color="rgba(255,255,255,0.95)" />
                <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statNumber}>{statsData.upcomingHomework}</Text>
              <Text style={styles.statLabel}>Homework</Text>
              {showStatHelp === 'homework' && (
                <Text style={styles.statHelpText}>Upcoming assignments</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>
          Updated {statsData.lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Important Alerts Section */}
        <ImportantAlerts
          alerts={[
            ...(statsData.upcomingHomework > 0
              ? [
                  {
                    id: 'homework-pending',
                    type: 'warning' as const,
                    title: 'Pending Homework',
                    message: `You have ${statsData.upcomingHomework} upcoming assignment${statsData.upcomingHomework > 1 ? 's' : ''} to review.`,
                    action: () => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })),
                    actionLabel: 'View Homework'},
                ]
              : []),
            ...(statsData.attendancePercentage < 75
              ? [
                  {
                    id: 'low-attendance',
                    type: 'danger' as const,
                    title: 'Low Attendance',
                    message: `Attendance is at ${statsData.attendancePercentage}%. Please ensure regular attendance.`,
                    action: () => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' })),
                    actionLabel: 'View Attendance'},
                ]
              : []),
          ].slice(0, 3)}
        />

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          {childrenLoading ? (
            <View style={styles.primaryGrid}>
              <ActionCardSkeleton />
              <ActionCardSkeleton />
              <ActionCardSkeleton />
              <ActionCardSkeleton />
            </View>
          ) : (
            <View style={styles.primaryGrid}>
              {primaryActions.map((action, index) => (
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
                      <action.icon size={28} color="white" />
                    </View>
                    <Text style={styles.primaryCardTitle}>{action.title}</Text>
                    <Text style={styles.primaryCardSubtitle}>{action.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <RecentActivity
          activities={[
            {
              id: '1',
              type: 'attendance',
              title: 'Attendance Marked',
              description: currentChild ? `${currentChild.full_name} marked present today` : 'Child marked present today',
              time: 'Today'},
            {
              id: '2',
              type: 'homework',
              title: 'New Homework',
              description: 'Mathematics assignment posted for review',
              time: '2 hours ago'},
            {
              id: '3',
              type: 'exam',
              title: 'Exam Results',
              description: 'Science test results available',
              time: 'Yesterday'},
          ]}
        />

        {/* More Tools - Reduced to 6 items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Tools</Text>
          <View style={styles.secondaryGrid}>
            {secondaryActions.slice(0, 6).map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.secondaryCard, { backgroundColor: action.lightBg }]}
                onPress={() => handleButtonPress(action.onPress)}
                activeOpacity={0.7}
              >
                <View style={[styles.secondaryIconContainer, { backgroundColor: action.color + '20' }]}>
                  <action.icon size={20} color={action.color} />
                </View>
                <Text style={[styles.secondaryCardTitle, { color: action.color }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color={schoolTheme.colors.parent.main} />
          </TouchableOpacity>
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
                  <Star size={10} color="#fbbf24" fill="#fbbf24" />
                </View>
              </View>
              <Text style={styles.childName}>{currentChild.full_name}</Text>
              <Text style={styles.childDetails}>
                Admission: {currentChild.admission_no || 'N/A'}
              </Text>
              <View style={styles.childActions}>
                <TouchableOpacity
                  style={[styles.childActionBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={() => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' }))}
                >
                  <Users size={18} color="white" />
                  <Text style={styles.childActionLabel}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.childActionBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' }))}
                >
                  <Calendar size={18} color="white" />
                  <Text style={styles.childActionLabel}>Timetable</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.childActionBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => handleButtonPress(() => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' }))}
                >
                  <BookOpen size={18} color="white" />
                  <Text style={styles.childActionLabel}>Homework</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: schoolTheme.colors.background.main},
  header: {
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32},
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12},
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1},
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)'},
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold},
  greetingContainer: {
    flex: 1},
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold},
  userName: {
    color: 'white',
    fontSize: 26,
    fontFamily: schoolTheme.typography.fonts.bold,
    marginTop: 2},
  headerRight: {
    flexDirection: 'row',
    gap: 12},
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'},
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'white'},
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10},
  statCard: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative'},
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6},
  statWithProgress: {
    marginBottom: 6},
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontFamily: schoolTheme.typography.fonts.bold},
  statLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    marginTop: 3,
    fontFamily: schoolTheme.typography.fonts.semibold},
  statHelpText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
    fontFamily: schoolTheme.typography.fonts.regular},
  lastUpdated: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: schoolTheme.typography.fonts.regular},
  childSelector: {
    marginTop: 16},
  childSelectorLabel: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.medium,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8},
  childSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'},
  childSelectorText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontFamily: schoolTheme.typography.fonts.medium},
  scrollView: {
    flex: 1},
  scrollContent: {
    paddingTop: 20},
  section: {
    marginBottom: 28,
    paddingHorizontal: 20},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16},
  sectionTitle: {
    fontSize: 22,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary},
  sectionLink: {
    color: schoolTheme.colors.parent.main,
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold},
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16},
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
    elevation: 3},
  primaryCardContent: {
    flex: 1,
    justifyContent: 'center'},
  primaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14},
  primaryCardTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    marginBottom: 4},
  primaryCardSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontFamily: schoolTheme.typography.fonts.medium},
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
    ...schoolTheme.shadows.sm},
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: schoolTheme.typography.fonts.bold},
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12},
  secondaryCard: {
    width: (width - 64) / 3,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    ...schoolTheme.shadows.sm},
  secondaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8},
  secondaryCardTitle: {
    fontSize: 13,
    fontFamily: schoolTheme.typography.fonts.bold,
    textAlign: 'center'},
  childCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3},
  childCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8},
  childGrade: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: '#1f2937'},
  activeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center'},
  childName: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: '#1f2937',
    marginBottom: 4},
  childDetails: {
    fontSize: 12,
    fontFamily: schoolTheme.typography.fonts.regular,
    color: '#6b7280',
    marginBottom: 12},
  childActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4},
  childActionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 4},
  childActionLabel: {
    color: 'white',
    fontSize: 10,
    fontFamily: schoolTheme.typography.fonts.semibold},
  emptyStateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3},
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center'},
  emptyStateText: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.regular,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24},
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: schoolTheme.colors.parent.main + '10',
    borderWidth: 1,
    borderColor: schoolTheme.colors.parent.main + '30'},
  seeAllText: {
    fontSize: 15,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.parent.main,
    marginRight: 4}});
