import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { supabase } from '../../src/lib/supabase';

// Custom components
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/Card';
import { Heading1, Heading2, Heading3, Body, BodySmall, Caption } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme/colors';
import FloatingActionButton from '../../src/components/FloatingActionButton';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren, useParentDashboardStats } from '../../src/hooks/useParentData';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const authContext = useAuth();
  const { user, isLoading: authLoading } = authContext || { user: null, isLoading: true };
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

  const menuItems = [
    {
      title: 'Homework',
      icon: 'assignment',
      color: theme.colors.purple[500],
      badge: stats?.upcomingHomework || 0,
      route: '/(tabs)/homework'
    },
    {
      title: 'Attendance',
      icon: 'event-available',
      color: theme.colors.blue[500],
      badge: null,
      route: '/(tabs)/attendance'
    },
    {
      title: 'Exams',
      icon: 'school',
      color: theme.colors.orange[500],
      badge: 0,
      route: '/(tabs)/exams'
    },
    {
      title: 'Timetable',
      icon: 'schedule',
      color: theme.colors.teal[500],
      badge: null,
      route: '/(tabs)/timetable'
    },
    {
      title: 'Gallery',
      icon: 'photo-library',
      color: theme.colors.pink[500],
      badge: null,
      route: '/(tabs)/gallery'
    },
    {
      title: 'Announcements',
      icon: 'campaign',
      color: theme.colors.indigo[500],
      badge: stats?.unread_announcements || 0,
      route: '/(tabs)/announcements'
    },
    {
      title: 'Calendar',
      icon: 'event',
      color: theme.colors.cyan[500],
      badge: null,
      route: '/(tabs)/calendar'
    },
    {
      title: 'Community',
      icon: 'forum',
      color: theme.colors.green[500],
      badge: null,
      route: '/(tabs)/feed'
    },
    {
      title: 'Settings',
      icon: 'settings',
      color: theme.colors.gray[500],
      badge: null,
      route: '/(tabs)/settings'
    },
  ];

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" color={theme.colors.primary[500]} />
          <Body variant="secondary" style={{ marginTop: theme.spacing.sm }}>
            Loading...
          </Body>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider>
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
                    {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Parent'} 👋
                  </Heading2>
                  <Body style={styles.welcomeSubtitle}>
                    Welcome to CampusHoster
                  </Body>
                </View>
                <View style={styles.welcomeIcon}>
                  <MaterialIcons name="account-circle" size={48} color={theme.colors.white} />
                </View>
              </CardContent>
            </LinearGradient>
          </Card>

          {/* Student Cards */}
          {children && children.length > 0 && (
            <View style={styles.section}>
              <Heading3 style={styles.sectionTitle}>Your Children</Heading3>
              <View style={styles.childrenGrid}>
                {children.map((child, index) => (
                  <Card key={index} variant="elevated" style={styles.childCard}>
                    <CardContent style={styles.childContent}>
                      <View style={styles.childInfo}>
                        <MaterialIcons name="account-circle" size={40} color={theme.colors.primary[500]} />
                        <View style={styles.childDetails}>
                          <Heading3 style={styles.childName}>{child.full_name}</Heading3>
                          <Body style={styles.childGrade}>Grade {child.sections?.grade} - {child.sections?.section}</Body>
                          <BodySmall style={styles.childTeacher}>
                            Teacher: {child.sections?.teachers?.first_name} {child.sections?.teachers?.last_name}
                          </BodySmall>
                        </View>
                      </View>
                      <View style={styles.childStats}>
                        <View style={styles.attendanceBadge}>
                          <BodySmall style={styles.attendanceLabel}>Attendance</BodySmall>
                          <Body style={[styles.attendanceValue, { color: getAttendanceColor(child.attendance_percentage || 0) }]}>
                            {child.attendance_percentage || 0}%
                          </Body>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {/* Quick Actions Grid */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Quick Actions</Heading3>
            <View style={styles.menuGrid}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => router.push(item.route)}
                >
                  <View style={styles.menuIconContainer}>
                    <MaterialIcons name={item.icon as any} size={28} color={item.color} />
                    {item.badge && item.badge > 0 && (
                      <View style={styles.badge}>
                        <Caption style={styles.badgeText}>{item.badge}</Caption>
                      </View>
                    )}
                  </View>
                  <Body style={styles.menuTitle}>{item.title}</Body>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stats Overview */}
          {stats && (
            <View style={styles.section}>
              <Heading3 style={styles.sectionTitle}>Overview</Heading3>
              <View style={styles.statsGrid}>
                <Card variant="elevated" style={styles.statCard}>
                  <CardContent style={styles.statContent}>
                    <View style={styles.statIcon}>
                      <MaterialIcons name="assignment" size={24} color={theme.colors.purple[500]} />
                    </View>
                    <View style={styles.statInfo}>
                      <Heading3 style={styles.statValue}>{stats.pending_homework || 0}</Heading3>
                      <Body style={styles.statLabel}>Pending Homework</Body>
                    </View>
                  </CardContent>
                </Card>

                <Card variant="elevated" style={styles.statCard}>
                  <CardContent style={styles.statContent}>
                    <View style={styles.statIcon}>
                      <MaterialIcons name="school" size={24} color={theme.colors.orange[500]} />
                    </View>
                    <View style={styles.statInfo}>
                      <Heading3 style={styles.statValue}>{stats.upcoming_exams || 0}</Heading3>
                      <Body style={styles.statLabel}>Upcoming Exams</Body>
                    </View>
                  </CardContent>
                </Card>

                <Card variant="elevated" style={styles.statCard}>
                  <CardContent style={styles.statContent}>
                    <View style={styles.statIcon}>
                      <MaterialIcons name="notifications" size={24} color={theme.colors.indigo[500]} />
                    </View>
                    <View style={styles.statInfo}>
                      <Heading3 style={styles.statValue}>{stats.unread_announcements || 0}</Heading3>
                      <Body style={styles.statLabel}>New Announcements</Body>
                    </View>
                  </CardContent>
                </Card>
              </View>
            </View>
          )}

          {/* Padding for FAB */}
          <View style={styles.fabPadding} />
        </ScrollView>

        {/* Floating Action Button */}
        <FloatingActionButton />
      </SafeAreaView>
    </PaperProvider>
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
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: theme.spacing.lg,
  },
  welcomeContent: {
    padding: 0,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  welcomeSubtitle: {
    color: theme.colors.white,
    opacity: 0.9,
  },
  welcomeIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  section: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  childrenGrid: {
    gap: theme.spacing.md,
  },
  childCard: {
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  childContent: {
    padding: theme.spacing.md,
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  childDetails: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  childGrade: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  childTeacher: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceBadge: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
  },
  attendanceLabel: {
    fontSize: 10,
    color: theme.colors.text.muted,
    marginBottom: 2,
  },
  attendanceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  menuItem: {
    width: (width - theme.spacing.md * 2 - theme.spacing.md * 2) / 3,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIconContainer: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.red[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: theme.colors.text.primary,
  },
  statsGrid: {
    gap: theme.spacing.md,
  },
  statCard: {
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  statIcon: {
    marginRight: theme.spacing.md,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  fabPadding: {
    height: 80,
  },
}); 