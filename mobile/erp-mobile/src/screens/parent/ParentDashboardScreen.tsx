import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
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
  Video,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  CheckCircle,
  Camera,
  Wallet,
  Send,
  Megaphone,
  ImageIcon,
  BarChart3,
  CalendarDays
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { schoolTheme } from '../../theme/schoolTheme';
import { StatCardSkeleton, ActionCardSkeleton } from '../../components/ui/SkeletonLoader';
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
    staleTime: 1000 * 60 * 5,
  });

  // Set default selected child when children load
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children.length, selectedChild]);

  // Fetch parent dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['parent-stats', user?.id, selectedChild],
    queryFn: async (): Promise<ParentStats> => {
      if (!user?.id) return {
        childrenCount: 0,
        upcomingHomework: 0,
        attendancePercentage: 0,
        lastActivity: 'Never',
        totalExams: 0,
        averageGrade: 'N/A',
        lastUpdated: new Date()
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
    staleTime: 1000 * 60 * 2,
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

  // Quick Actions - matching teacher portal colors
  const primaryActions = [
    {
      title: "View Attendance",
      subtitle: "Track daily presence",
      icon: CheckCircle,
      color: '#10B981', // Emerald green
      lightBg: '#D1FAE5',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' })
    },
    {
      title: "Check Homework",
      subtitle: "Assignments & tasks",
      icon: BookOpen,
      color: '#F59E0B', // Amber
      lightBg: '#FEF3C7',
      badge: statsData.upcomingHomework > 0 ? statsData.upcomingHomework : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: "View Timetable",
      subtitle: "Today's schedule",
      icon: Calendar,
      color: '#3B82F6', // Blue
      lightBg: '#DBEAFE',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Community",
      subtitle: "Connect with school",
      icon: MessageSquare,
      color: '#8B5CF6', // Purple
      lightBg: '#EDE9FE',
      onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Community' })
    }
  ];

  // Categorized tools matching teacher portal structure
  const categorizedTools = {
    academic: {
      title: "📚 Academic",
      color: '#4F46E5',
      items: [
        {
          title: "Exams",
          icon: Award,
          color: schoolTheme.quickActions.exams.color,
          lightBg: schoolTheme.quickActions.exams.lightBg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
        },
        {
          title: "Report Cards",
          icon: FileText,
          color: schoolTheme.quickActions.reports.color,
          lightBg: schoolTheme.quickActions.reports.lightBg,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Reports' })
        },
        {
          title: "Analytics",
          icon: BarChart3,
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
          title: "Fee Receipts",
          icon: Wallet,
          color: '#10b981',
          lightBg: '#d1fae5',
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Receipts' })
        },
        {
          title: "Feedback",
          icon: MessageSquare,
          color: '#f59e0b',
          lightBg: '#fef3c7',
          onPress: () => (navigation as any).navigate('DashboardTab', { screen: 'Feedback' })
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
          icon: CalendarDays,
          color: schoolTheme.quickActions.calendar?.color || schoolTheme.colors.primary.main,
          lightBg: schoolTheme.quickActions.calendar?.lightBg || schoolTheme.colors.secondary.light,
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Calendar' })
        },
        {
          title: "Gallery",
          icon: ImageIcon,
          color: '#ec4899',
          lightBg: '#fce7f3',
          onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Gallery' })
        },
      ]
    }
  };

  // Recent activities
  const recentActivities = [
    {
      id: '1',
      type: 'attendance' as const,
      title: 'Attendance Marked',
      description: currentChild ? `${currentChild.full_name} marked present today` : 'Child marked present today',
      time: 'Today',
    },
    {
      id: '2',
      type: 'homework' as const,
      title: 'New Homework',
      description: 'Mathematics assignment posted for review',
      time: '2 hours ago',
    },
    {
      id: '3',
      type: 'exam' as const,
      title: 'Exam Results',
      description: 'Science test results available',
      time: 'Yesterday',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Child Selector Modal */}
      <ChildSelectorModal
        visible={showChildSelector}
        children={children}
        selectedChildId={selectedChild}
        onSelect={handleChildSelect}
        onClose={() => setShowChildSelector(false)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Colorful Header - matching teacher portal */}
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
                  <Users size={32} color="white" />
                </View>
              </TouchableOpacity>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.userName}>{user?.first_name}!</Text>
              </View>
            </View>
          </View>

          {/* Child Selector */}
          {children.length > 1 && (
            <View style={styles.childSelector}>
              <Text style={styles.childSelectorLabel}>Viewing</Text>
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

          {/* Stats Cards - 4 cards matching teacher layout */}
          {childrenLoading || statsLoading ? (
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
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'attendance' ? null : 'attendance'))}
              >
                <View style={styles.statHeader}>
                  <Users size={26} color="rgba(255,255,255,0.95)" />
                  <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
                </View>
                <Text style={styles.statNumber}>{statsData.attendancePercentage}%</Text>
                <Text style={styles.statLabel}>Attendance</Text>
                {showStatHelp === 'attendance' && (
                  <Text style={styles.statHelpText}>This month's attendance rate</Text>
                )}
              </TouchableOpacity>
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
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                onPress={() => handleButtonPress(() => setShowStatHelp(showStatHelp === 'grade' ? null : 'grade'))}
              >
                <View style={styles.statHeader}>
                  <Award size={26} color="rgba(255,255,255,0.95)" />
                  <HelpCircle size={14} color="rgba(255,255,255,0.7)" />
                </View>
                <Text style={styles.statNumber}>{statsData.averageGrade}</Text>
                <Text style={styles.statLabel}>Avg. Grade</Text>
                {showStatHelp === 'grade' && (
                  <Text style={styles.statHelpText}>Average performance</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Last Updated */}
          <Text style={styles.lastUpdated}>
            Updated {statsData.lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </LinearGradient>

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
                    actionLabel: 'View Homework'
                  },
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
                    actionLabel: 'View Attendance'
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
        <RecentActivity activities={recentActivities} />

        {/* Categorized Tools - matching teacher portal */}
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
              {category.items.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryCard}
                    onPress={() => handleButtonPress(item.onPress)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[item.lightBg, 'white']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.categoryCardGradient}
                    >
                      <View style={[styles.categoryIconWrapper, { backgroundColor: item.color + '15' }]}>
                        <IconComponent size={24} color={item.color} strokeWidth={2.5} />
                      </View>
                      <Text style={styles.categoryCardTitle}>{item.title}</Text>
                      <View style={[styles.categoryCardArrow, { backgroundColor: item.color + '10' }]}>
                        <ChevronRight size={14} color={item.color} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Bottom Spacing */}
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
    backgroundColor: schoolTheme.colors.background.main
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
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
    borderColor: 'rgba(255,255,255,0.5)'
  },
  greetingContainer: {
    flex: 1
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold
  },
  userName: {
    color: 'white',
    fontSize: 26,
    fontFamily: schoolTheme.typography.fonts.bold,
    marginTop: 2
  },
  childSelector: {
    marginBottom: 20
  },
  childSelectorLabel: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.medium,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8
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
    borderColor: 'rgba(255,255,255,0.2)'
  },
  childSelectorText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontFamily: schoolTheme.typography.fonts.medium
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16
  },
  statCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: 100
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  statNumber: {
    color: 'white',
    fontSize: 22,
    fontFamily: schoolTheme.typography.fonts.bold
  },
  statLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: schoolTheme.typography.fonts.semibold,
    textAlign: 'center'
  },
  statHelpText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
    fontFamily: schoolTheme.typography.fonts.regular
  },
  lastUpdated: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: schoolTheme.typography.fonts.regular
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary
  },
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  primaryCard: {
    width: (width - 56) / 2,
    height: 160,
    borderRadius: 20,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  primaryCardContent: {
    flex: 1,
    justifyContent: 'center'
  },
  primaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  primaryCardTitle: {
    color: 'white',
    fontSize: 17,
    fontFamily: schoolTheme.typography.fonts.bold,
    marginBottom: 4
  },
  primaryCardSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontFamily: schoolTheme.typography.fonts.medium
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
    zIndex: 10
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: schoolTheme.typography.fonts.bold
  },
  categorySection: {
    marginBottom: 24,
    paddingHorizontal: 20
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  categoryBadgeText: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.bold
  },
  categoryGrid: {
    gap: 12
  },
  categoryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...schoolTheme.shadows.md,
    marginBottom: 8
  },
  categoryCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  categoryCardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary
  },
  categoryCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
