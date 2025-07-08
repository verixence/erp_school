import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';
import { useExamPapers } from '../../src/hooks/useTeacherData';
import { Ionicons } from '@expo/vector-icons';

export default function ExamsScreen() {
  const { user } = useAuth();
  const { data: examPapers = [], isLoading, refetch } = useExamPapers(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredExamPapers = examPapers.filter(paper => {
    const examDate = paper.exam_date ? new Date(paper.exam_date) : null;
    const now = new Date();
    
    if (statusFilter === 'upcoming') {
      return examDate && examDate > now;
    } else if (statusFilter === 'completed') {
      return examDate && examDate <= now;
    }
    return true;
  });

  const getStatusColor = (examDate: string | null) => {
    if (!examDate) return '#9CA3AF';
    const date = new Date(examDate);
    const now = new Date();
    return date > now ? '#10B981' : '#6B7280';
  };

  const getStatusText = (examDate: string | null) => {
    if (!examDate) return 'Not Scheduled';
    const date = new Date(examDate);
    const now = new Date();
    return date > now ? 'Upcoming' : 'Completed';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exam Papers</Text>
        <Text style={styles.headerSubtitle}>Manage your exam papers and schedules</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'completed'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              statusFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text style={[
              styles.filterTabText,
              statusFilter === filter && styles.filterTabTextActive
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{examPapers.length}</Text>
            <Text style={styles.statLabel}>Total Papers</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>
              {examPapers.filter(p => p.exam_date && new Date(p.exam_date) > new Date()).length}
            </Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>
              {examPapers.filter(p => p.exam_date && new Date(p.exam_date) <= new Date()).length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Exam Papers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {statusFilter === 'all' ? 'All Exam Papers' : 
             statusFilter === 'upcoming' ? 'Upcoming Exams' : 'Completed Exams'}
          </Text>
          
          {filteredExamPapers.length > 0 ? (
            <View style={styles.examPapersList}>
              {filteredExamPapers.map((paper, index) => (
                <View key={index} style={styles.examPaperCard}>
                  <View style={styles.examPaperHeader}>
                    <View style={styles.examPaperInfo}>
                      <Text style={styles.examPaperSubject}>{paper.subject}</Text>
                      <Text style={styles.examPaperSection}>Section: {paper.section}</Text>
                    </View>
                    <View style={[styles.examStatus, { backgroundColor: getStatusColor(paper.exam_date) }]}>
                      <Text style={styles.examStatusText}>
                        {getStatusText(paper.exam_date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.examPaperDetails}>
                    <View style={styles.examDetailRow}>
                      <Ionicons name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.examDetailText}>
                        {paper.exam_date 
                          ? new Date(paper.exam_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Not scheduled'
                        }
                      </Text>
                    </View>
                    
                    {paper.exam_time && (
                      <View style={styles.examDetailRow}>
                        <Ionicons name="time" size={16} color="#6B7280" />
                        <Text style={styles.examDetailText}>{paper.exam_time}</Text>
                      </View>
                    )}
                    
                    <View style={styles.examDetailRow}>
                      <Ionicons name="trophy" size={16} color="#6B7280" />
                      <Text style={styles.examDetailText}>{paper.max_marks} marks</Text>
                    </View>

                    {paper.duration_minutes && (
                      <View style={styles.examDetailRow}>
                        <Ionicons name="hourglass" size={16} color="#6B7280" />
                        <Text style={styles.examDetailText}>{paper.duration_minutes} minutes</Text>
                      </View>
                    )}

                    {paper.venue && (
                      <View style={styles.examDetailRow}>
                        <Ionicons name="location" size={16} color="#6B7280" />
                        <Text style={styles.examDetailText}>{paper.venue}</Text>
                      </View>
                    )}
                  </View>

                  {paper.exam_groups && (
                    <View style={styles.examGroupInfo}>
                      <Text style={styles.examGroupName}>{paper.exam_groups.name}</Text>
                      <Text style={styles.examGroupType}>{paper.exam_groups.exam_type}</Text>
                    </View>
                  )}

                  {paper.instructions && (
                    <View style={styles.examInstructions}>
                      <Text style={styles.examInstructionsLabel}>Instructions:</Text>
                      <Text style={styles.examInstructionsText}>{paper.instructions}</Text>
                    </View>
                  )}

                  <View style={styles.examActions}>
                    <TouchableOpacity style={styles.examActionButton}>
                      <Ionicons name="create" size={16} color="#3B82F6" />
                      <Text style={styles.examActionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.examActionButton}>
                      <Ionicons name="people" size={16} color="#10B981" />
                      <Text style={styles.examActionButtonText}>Students</Text>
                    </TouchableOpacity>
                    
                    {paper.exam_date && new Date(paper.exam_date) <= new Date() && (
                      <TouchableOpacity style={[styles.examActionButton, styles.marksButton]}>
                        <Ionicons name="clipboard" size={16} color="#ffffff" />
                        <Text style={[styles.examActionButtonText, styles.marksButtonText]}>Marks</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Exam Papers</Text>
              <Text style={styles.emptyStateText}>
                {statusFilter === 'all' 
                  ? 'You don\'t have any exam papers created yet.'
                  : statusFilter === 'upcoming'
                  ? 'No upcoming exams scheduled.'
                  : 'No completed exams found.'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -15,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  examPapersList: {
    gap: 16,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examPaperInfo: {
    flex: 1,
  },
  examPaperSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  examPaperSection: {
    fontSize: 14,
    color: '#6B7280',
  },
  examStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  examStatusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  examPaperDetails: {
    gap: 8,
    marginBottom: 12,
  },
  examDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examDetailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  examGroupInfo: {
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  examGroupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 2,
  },
  examGroupType: {
    fontSize: 12,
    color: '#6B7280',
  },
  examInstructions: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  examInstructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  examInstructionsText: {
    fontSize: 14,
    color: '#92400E',
  },
  examActions: {
    flexDirection: 'row',
    gap: 8,
  },
  examActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  examActionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  marksButton: {
    backgroundColor: '#3B82F6',
  },
  marksButtonText: {
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 