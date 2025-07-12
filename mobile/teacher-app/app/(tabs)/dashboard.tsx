import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTeacherDashboardStats, useTeacherSections, useExamPapers } from '../../src/hooks/useTeacherData';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import FloatingActionButton from '../../src/components/FloatingActionButton';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTeacherDashboardStats(user?.id);
  const { data: sections = [], isLoading: sectionsLoading } = useTeacherSections(user?.id);
  const { data: examPapers = [], isLoading: examPapersLoading } = useExamPapers(user?.id);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  }, [refetchStats]);

  const quickActions = [
    {
      title: 'Take Attendance',
      description: 'Mark attendance for your classes',
      icon: 'checkmark-circle',
      color: '#10B981',
      onPress: () => router.push('/attendance'),
    },
    {
      title: 'Create Homework',
      description: 'Assign new homework to students',
      icon: 'book',
      color: '#8B5CF6',
      onPress: () => router.push('/homework'),
    },
    {
      title: 'View Timetable',
      description: 'Check your class schedule',
      icon: 'calendar',
      color: '#F59E0B',
      onPress: () => router.push('/timetable'),
    },
    {
      title: 'Announcements',
      description: 'Create or view announcements',
      icon: 'megaphone',
      color: '#EF4444',
      onPress: () => router.push('/announcements'),
    },
  ];

  const recentExamPapers = examPapers.slice(0, 3);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.nameText}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person-circle" size={40} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="school" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{stats?.sectionsCount || 0}</Text>
            <Text style={styles.statLabel}>My Sections</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{stats?.studentsCount || 0}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-today" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{stats?.todaysClasses || 0}</Text>
            <Text style={styles.statLabel}>Today's Classes</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#ffffff" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Sections */}
        {sections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Sections</Text>
            <View style={styles.sectionsGrid}>
              {sections.map((section, index) => (
                <View key={index} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionGrade}>Grade {section.grade}</Text>
                    <Text style={styles.sectionName}>Section {section.section}</Text>
                  </View>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity 
                      style={styles.sectionButton}
                      onPress={() => router.push(`/attendance?section=${section.id}`)}
                    >
                      <Text style={styles.sectionButtonText}>Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.sectionButton}
                      onPress={() => router.push(`/timetable?section=${section.id}`)}
                    >
                      <Text style={styles.sectionButtonText}>Timetable</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Exam Papers */}
        {recentExamPapers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Exam Papers</Text>
            <View style={styles.examPapersContainer}>
              {recentExamPapers.map((paper, index) => (
                <View key={index} style={styles.examPaperCard}>
                  <View style={styles.examPaperHeader}>
                    <Text style={styles.examPaperSubject}>{paper.subject}</Text>
                    <Text style={styles.examPaperDate}>
                      {paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                  <Text style={styles.examPaperSection}>Section: {paper.section}</Text>
                  <Text style={styles.examPaperMarks}>Max Marks: {paper.max_marks}</Text>
                  {paper.exam_groups && (
                    <Text style={styles.examPaperGroup}>{paper.exam_groups.name}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Today's Schedule Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <View style={styles.schedulePreview}>
            <Text style={styles.scheduleMessage}>
              View your complete schedule in the Timetable tab
            </Text>
            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={() => router.push('/timetable')}
            >
              <Text style={styles.scheduleButtonText}>View Timetable</Text>
              <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  profileButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionsGrid: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionGrade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sectionName: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sectionButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  examPapersContainer: {
    gap: 12,
  },
  examPaperCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  examPaperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  examPaperSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  examPaperDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  examPaperSection: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  examPaperMarks: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  examPaperGroup: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  schedulePreview: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scheduleMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  scheduleButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
}); 