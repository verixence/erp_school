import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Custom components
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/Card';
import { Heading1, Heading2, Heading3, Body, BodySmall, Caption } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme/colors';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren, useParentDashboardStats } from '../../src/hooks/useParentData';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Only fetch data if user is authenticated
  const { data: children, isLoading: childrenLoading, refetch: refetchChildren } = useChildren(user?.id);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useParentDashboardStats(user?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchChildren(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchChildren, refetchStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return theme.colors.green[500];
    if (percentage >= 75) return theme.colors.yellow[500];
    return theme.colors.red[500];
  };

  const quickActions = [
    {
      title: 'View Attendance',
      description: 'Check daily attendance records',
      icon: 'event-available',
      color: theme.colors.blue[500],
      route: '/(tabs)/attendance'
    },
    {
      title: 'Review Homework',
      description: 'View assigned homework',
      icon: 'assignment',
      color: theme.colors.green[500],
      route: '/(tabs)/homework'
    },
    {
      title: 'Class Timetable',
      description: 'View weekly schedule',
      icon: 'schedule',
      color: theme.colors.purple[500],
      route: '/(tabs)/timetable'
    },
    {
      title: 'Exam Reports',
      description: 'View exam schedules and results',
      icon: 'school',
      color: theme.colors.orange[500],
      route: '/(tabs)/exams'
    },
    {
      title: 'Announcements',
      description: 'School announcements and news',
      icon: 'campaign',
      color: theme.colors.indigo[500],
      route: '/(tabs)/announcements'
    },
    {
      title: 'Community Feed',
      description: 'Connect with teachers and parents',
      icon: 'forum',
      color: theme.colors.teal[500],
      route: '/(tabs)/feed'
    },
  ];

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="refresh" size={32} color={theme.colors.primary[500]} />
          <Body variant="secondary" style={{ marginTop: theme.spacing.sm }}>
            Loading...
          </Body>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <Card variant="elevated" style={styles.welcomeCard}>
          <LinearGradient
            colors={[theme.colors.primary[500], theme.colors.primary[600]]}
            style={styles.welcomeGradient}
          >
            <CardContent style={styles.welcomeContent}>
              <View style={styles.welcomeText}>
                <Caption style={styles.greetingText}>{getGreeting()}</Caption>
                <Heading2 style={styles.welcomeTitle}>
                  {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Parent'}
                </Heading2>
                <Body style={styles.welcomeSubtitle}>
                  Welcome to your parent dashboard
                </Body>
              </View>
              <View style={styles.welcomeIcon}>
                <MaterialIcons name="waving-hand" size={32} color={theme.colors.white} />
              </View>
            </CardContent>
          </LinearGradient>
        </Card>

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Heading3 style={styles.sectionTitle}>Overview</Heading3>
          <View style={styles.statsGrid}>
            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: theme.colors.blue[100] }]}>
                    <MaterialIcons name="people" size={20} color={theme.colors.blue[600]} />
                  </View>
                  <Caption variant="secondary">Children</Caption>
                </View>
                <Heading2 style={styles.statValue}>
                  {statsLoading ? '...' : stats?.childrenCount || 0}
                </Heading2>
                <Caption variant="muted">Enrolled</Caption>
              </CardContent>
            </Card>

            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: theme.colors.green[100] }]}>
                    <MaterialIcons name="assignment" size={20} color={theme.colors.green[600]} />
                  </View>
                  <Caption variant="secondary">Homework</Caption>
                </View>
                <Heading2 style={styles.statValue}>
                  {statsLoading ? '...' : stats?.upcomingHomework || 0}
                </Heading2>
                <Caption variant="muted">Pending</Caption>
              </CardContent>
            </Card>

            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: theme.colors.purple[100] }]}>
                    <MaterialIcons name="event-available" size={20} color={theme.colors.purple[600]} />
                  </View>
                  <Caption variant="secondary">Attendance</Caption>
                </View>
                <Heading2 style={[
                  styles.statValue,
                  { color: getAttendanceColor(stats?.attendancePercentage || 0) }
                ]}>
                  {statsLoading ? '...' : `${stats?.attendancePercentage || 0}%`}
                </Heading2>
                <Caption variant="muted">This month</Caption>
              </CardContent>
            </Card>

            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: theme.colors.orange[100] }]}>
                    <MaterialIcons name="notifications" size={20} color={theme.colors.orange[600]} />
                  </View>
                  <Caption variant="secondary">Updates</Caption>
                </View>
                <Heading2 style={styles.statValue}>
                  {statsLoading ? '...' : stats?.recentAnnouncements || 0}
                </Heading2>
                <Caption variant="muted">Recent</Caption>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Children Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heading3 style={styles.sectionTitle}>My Children</Heading3>
            {children && children.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/attendance')}>
                <Body variant="primary" weight="medium">View All</Body>
              </TouchableOpacity>
            )}
          </View>
          
          {childrenLoading ? (
            <Card variant="default" style={styles.loadingCard}>
              <CardContent style={styles.loadingContent}>
                <MaterialIcons name="refresh" size={32} color={theme.colors.primary[500]} />
                <Body variant="secondary" style={{ marginTop: theme.spacing.sm }}>
                  Loading children...
                </Body>
              </CardContent>
            </Card>
          ) : children && children.length > 0 ? (
            <View style={styles.childrenContainer}>
              {children.map((child) => (
                <Card key={child.id} variant="default" style={styles.childCard}>
                  <CardContent style={styles.childContent}>
                    <View style={styles.childHeader}>
                      <View style={styles.childAvatar}>
                        <MaterialIcons name="person" size={24} color={theme.colors.primary[500]} />
                      </View>
                      <View style={styles.childInfo}>
                        <Heading3 style={styles.childName}>{child.full_name}</Heading3>
                        <Body variant="secondary" style={styles.childGrade}>
                          Grade {child.sections?.grade} • Section {child.sections?.section}
                        </Body>
                        <Caption variant="muted">
                          Admission: {child.admission_no || 'N/A'}
                        </Caption>
                      </View>
                      <TouchableOpacity
                        style={styles.childMenuButton}
                        onPress={() => router.push('/(tabs)/attendance')}
                      >
                        <MaterialIcons name="arrow-forward-ios" size={16} color={theme.colors.text.muted} />
                      </TouchableOpacity>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : (
            <Card variant="default" style={styles.emptyCard}>
              <CardContent style={styles.emptyContent}>
                <MaterialIcons name="people-outline" size={64} color={theme.colors.text.muted} />
                <Heading3 variant="secondary" style={styles.emptyTitle}>No Children Found</Heading3>
                <Body variant="muted" style={styles.emptyText}>
                  No children are currently linked to your account. Contact your school administration if this is an error.
                </Body>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Quick Actions</Heading3>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <Card variant="default" style={styles.quickActionCard}>
                  <CardContent style={styles.quickActionContent}>
                    <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                      <MaterialIcons 
                        name={action.icon as any} 
                        size={24} 
                        color={action.color} 
                      />
                    </View>
                    <View style={styles.quickActionText}>
                      <Body weight="medium" style={styles.quickActionTitle}>
                        {action.title}
                      </Body>
                      <Caption variant="secondary" style={styles.quickActionDescription}>
                        {action.description}
                      </Caption>
                    </View>
                    <MaterialIcons 
                      name="arrow-forward-ios" 
                      size={16} 
                      color={theme.colors.text.muted} 
                    />
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Recent Activity</Heading3>
          <Card variant="default" style={styles.activityCard}>
            <CardContent style={styles.activityContent}>
              <View style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: theme.colors.green[100] }]}>
                  <MaterialIcons name="check-circle" size={16} color={theme.colors.green[600]} />
                </View>
                <View style={styles.activityText}>
                  <Body style={styles.activityTitle}>Homework submitted</Body>
                  <Caption variant="secondary">Math Assignment - 2 hours ago</Caption>
                </View>
              </View>

              <View style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: theme.colors.blue[100] }]}>
                  <MaterialIcons name="event-available" size={16} color={theme.colors.blue[600]} />
                </View>
                <View style={styles.activityText}>
                  <Body style={styles.activityTitle}>Attendance marked</Body>
                  <Caption variant="secondary">Present today - 8:30 AM</Caption>
                </View>
              </View>

              <View style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: theme.colors.orange[100] }]}>
                  <MaterialIcons name="campaign" size={16} color={theme.colors.orange[600]} />
                </View>
                <View style={styles.activityText}>
                  <Body style={styles.activityTitle}>New announcement</Body>
                  <Caption variant="secondary">School holiday notice - Yesterday</Caption>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  welcomeCard: {
    overflow: 'hidden',
  },
  welcomeGradient: {
    borderRadius: theme.borderRadius.lg,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  welcomeText: {
    flex: 1,
  },
  greetingText: {
    color: theme.colors.white,
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  welcomeTitle: {
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  welcomeSubtitle: {
    color: theme.colors.white,
    opacity: 0.9,
  },
  welcomeIcon: {
    marginLeft: theme.spacing.md,
  },
  statsSection: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: (width - theme.spacing.md * 2 - theme.spacing.sm) / 2,
    borderColor: theme.colors.border,
  },
  statContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  section: {
    gap: theme.spacing.md,
  },
  loadingCard: {
    borderColor: theme.colors.border,
  },
  loadingContent: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  childrenContainer: {
    gap: theme.spacing.sm,
  },
  childCard: {
    borderColor: theme.colors.border,
  },
  childContent: {
    padding: theme.spacing.md,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  childAvatar: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  childName: {
    color: theme.colors.text.primary,
  },
  childGrade: {
    fontSize: theme.typography.fontSize.sm,
  },
  childMenuButton: {
    padding: theme.spacing.sm,
  },
  emptyCard: {
    borderColor: theme.colors.border,
  },
  emptyContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActionsGrid: {
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    width: '100%',
  },
  quickActionCard: {
    borderColor: theme.colors.border,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  quickActionTitle: {
    color: theme.colors.text.primary,
  },
  quickActionDescription: {
    fontSize: theme.typography.fontSize.sm,
  },
  activityCard: {
    borderColor: theme.colors.border,
  },
  activityContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  activityTitle: {
    color: theme.colors.text.primary,
  },
}); 