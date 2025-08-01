import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  school_id: string;
  sections: {
    id: string;
    grade: number;
    section: string;
  };
}

interface ExamGroup {
  id: string;
  name: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
}

interface ExamPaper {
  id: string;
  subject: string;
  exam_date: string;
  exam_time: string;
  max_marks: number;
  duration_minutes: number;
  venue: string;
  exam_groups: {
    id: string;
    name: string;
    exam_type: string;
  };
  marks?: {
    id: string;
    marks_obtained: number;
    grade: string;
    remarks: string;
  }[];
}

interface ReportCard {
  id: string;
  exam_group_id: string;
  student_id: string;
  total_marks: number;
  percentage: number;
  grade: string;
  rank: number;
  status: string;
  created_at: string;
}

const ParentExamsScreen: React.FC = () => {
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'results' | 'reports'>('schedule');

  const queryClient = useQueryClient();

  // Fetch children
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('Not authenticated');

             const { data, error } = await supabase
         .from('student_parents')
         .select(`
           student_id,
           students!inner(
             id,
             full_name,
             admission_no,
             section_id,
             school_id,
             sections!inner(
               id,
               grade,
               section
             )
           )
         `)
         .eq('parent_id', profile.user.id);

       if (error) {
         console.error('Error fetching children:', error);
         throw error;
       }

       console.log('Fetched children:', data?.length || 0);
       return (data || []).map((item: any) => ({
         id: item.students.id,
         full_name: item.students.full_name,
         admission_no: item.students.admission_no,
         school_id: item.students.school_id,
         sections: item.students.sections
       })) as Child[];
    }
  });

  // Auto-select first child
  React.useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch exam groups for selected child
  const { data: examGroups = [] } = useQuery({
    queryKey: ['child-exam-groups', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];

      const child = children.find(c => c.id === selectedChild);
      if (!child) return [];

      const { data, error } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', child.school_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExamGroup[];
    },
    enabled: !!selectedChild && children.length > 0
  });

  // Fetch exam papers for selected child
  const { data: examPapers = [] } = useQuery({
    queryKey: ['child-exam-papers', selectedChild, selectedExamGroup],
    queryFn: async () => {
      if (!selectedChild) {
        console.log('No selected child for exam papers');
        return [];
      }

      const child = children.find(c => c.id === selectedChild);
      if (!child) {
        console.log('Child not found for exam papers:', selectedChild);
        return [];
      }

      console.log('Fetching exam papers for child:', child.full_name, 'Section ID:', child.sections.id);

      // Construct section format to match exam papers (e.g., "Grade 1 A")
      const examSection = `Grade ${child.sections.grade} ${child.sections.section}`;
      console.log('Using exam section format:', examSection);

      let query = supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups(
            id,
            name,
            exam_type,
            start_date,
            end_date,
            is_published
          )
        `)
        .eq('section', examSection)
        .eq('school_id', child.school_id)
        .order('exam_date', { ascending: true });

      if (selectedExamGroup) {
        console.log('Filtering by exam group:', selectedExamGroup);
        query = query.eq('exam_group_id', selectedExamGroup);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Exam papers fetch error:', error);
        throw error;
      }
      
      console.log('Exam papers data:', data?.length || 0, 'papers found');
      
      // Filter for published exams only (parents should only see published ones)
      const publishedExams = (data || []).filter((exam: any) => 
        exam.exam_groups && exam.exam_groups.is_published === true
      );
      
      console.log('Published exam papers:', publishedExams.length, 'papers found');
      return publishedExams as ExamPaper[];
    },
    enabled: !!selectedChild && children.length > 0
  });

  // Fetch report cards
  const { data: reportCards = [] } = useQuery({
    queryKey: ['child-report-cards', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', selectedChild)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReportCard[];
    },
    enabled: !!selectedChild
  });

  const currentChild = children.find(c => c.id === selectedChild);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not scheduled';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getExamStatus = (examDate: string, examTime: string) => {
    const now = new Date();
    const examDateTime = new Date(`${examDate}T${examTime}`);
    
    if (examDateTime > now) return 'upcoming';
    if (examDateTime < now) return 'completed';
    return 'ongoing';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#3B82F6';
      case 'ongoing': return '#10B981';
      case 'completed': return '#6B7280';
      default: return '#F59E0B';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['parent-children'] });
    await queryClient.invalidateQueries({ queryKey: ['child-exam-groups'] });
    await queryClient.invalidateQueries({ queryKey: ['child-exam-papers'] });
    await queryClient.invalidateQueries({ queryKey: ['child-report-cards'] });
    setRefreshing(false);
  };

  const renderChildSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Select Child:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[styles.childChip, selectedChild === child.id && styles.childChipActive]}
            onPress={() => setSelectedChild(child.id)}
          >
            <Text style={[styles.childChipText, selectedChild === child.id && styles.childChipTextActive]}>
              {child.full_name}
            </Text>
            <Text style={[styles.childChipSubtext, selectedChild === child.id && styles.childChipSubtextActive]}>
              Grade {child.sections.grade}{child.sections.section}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderExamGroupFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedExamGroup && styles.filterChipActive]}
          onPress={() => setSelectedExamGroup('')}
        >
          <Text style={[styles.filterChipText, !selectedExamGroup && styles.filterChipTextActive]}>
            All Exams
          </Text>
        </TouchableOpacity>
        {examGroups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[styles.filterChip, selectedExamGroup === group.id && styles.filterChipActive]}
            onPress={() => setSelectedExamGroup(group.id)}
          >
            <Text style={[styles.filterChipText, selectedExamGroup === group.id && styles.filterChipTextActive]}>
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderExamPaper = ({ item }: { item: ExamPaper }) => {
    const status = getExamStatus(item.exam_date, item.exam_time);
    const statusColor = getStatusColor(status);
    const marks = item.marks && item.marks.length > 0 ? item.marks[0] : null;

    return (
      <Card style={styles.examCard}>
        <View style={styles.examHeader}>
          <View style={styles.examInfo}>
            <Text style={styles.examSubject}>{item.subject}</Text>
            <Text style={styles.examGroup}>{item.exam_groups?.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
          </View>
        </View>

        <View style={styles.examDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.exam_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{formatTime(item.exam_time)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{item.duration_minutes} minutes</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Max Marks:</Text>
            <Text style={styles.detailValue}>{item.max_marks}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Venue:</Text>
            <Text style={styles.detailValue}>{item.venue || 'TBA'}</Text>
          </View>

          {marks && (
            <>
              <View style={styles.separator} />
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>Result:</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Marks Obtained:</Text>
                  <Text style={[styles.detailValue, styles.marksText]}>
                    {marks.marks_obtained}/{item.max_marks}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grade:</Text>
                  <Text style={[styles.detailValue, styles.gradeText]}>{marks.grade}</Text>
                </View>
                {marks.remarks && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remarks:</Text>
                    <Text style={styles.detailValue}>{marks.remarks}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </Card>
    );
  };

  const renderReportCard = ({ item }: { item: ReportCard }) => (
    <Card style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>Report Card</Text>
          <Text style={styles.reportDate}>{formatDate(item.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => {
            setSelectedReport(item);
            setShowReportModal(true);
          }}
        >
          <Text style={styles.downloadButtonText}>View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportDetails}>
        <View style={styles.reportStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.percentage}%</Text>
            <Text style={styles.statLabel}>Percentage</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.grade}</Text>
            <Text style={styles.statLabel}>Grade</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{item.rank}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_marks}</Text>
            <Text style={styles.statLabel}>Total Marks</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exam Management</Text>
        <Text style={styles.headerSubtitle}>View exam schedules and results</Text>
      </View>

      {/* Child Selector */}
      {children.length > 0 && renderChildSelector()}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
            Schedule
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'results' && styles.activeTab]}
          onPress={() => setActiveTab('results')}
        >
          <Text style={[styles.tabText, activeTab === 'results' && styles.activeTabText]}>
            Results
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Report Cards
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {currentChild && (
          <Card style={styles.childInfoCard}>
            <Text style={styles.childInfoName}>{currentChild.full_name}</Text>
            <Text style={styles.childInfoDetails}>
              Grade {currentChild.sections.grade}{currentChild.sections.section} • {currentChild.admission_no}
            </Text>
          </Card>
        )}

        {(activeTab === 'schedule' || activeTab === 'results') && (
          <FlatList
            data={examPapers}
            renderItem={renderExamPaper}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderExamGroupFilter}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No exam papers found</Text>
                <Text style={styles.emptySubtext}>
                  Exam schedules will appear here when published by the school
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'reports' && (
          <FlatList
            data={reportCards}
            renderItem={renderReportCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No report cards available</Text>
                <Text style={styles.emptySubtext}>
                  Report cards will appear here after exam results are published
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Report Card Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Card Details</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {selectedReport && (
            <View style={styles.modalContent}>
              <Card style={styles.reportDetailsCard}>
                <Text style={styles.reportDetailsTitle}>Academic Performance Summary</Text>
                
                <View style={styles.reportDetailsGrid}>
                  <View style={styles.reportDetailItem}>
                    <Text style={styles.reportDetailLabel}>Total Marks</Text>
                    <Text style={styles.reportDetailValue}>{selectedReport.total_marks}</Text>
                  </View>
                  <View style={styles.reportDetailItem}>
                    <Text style={styles.reportDetailLabel}>Percentage</Text>
                    <Text style={styles.reportDetailValue}>{selectedReport.percentage}%</Text>
                  </View>
                  <View style={styles.reportDetailItem}>
                    <Text style={styles.reportDetailLabel}>Grade</Text>
                    <Text style={styles.reportDetailValue}>{selectedReport.grade}</Text>
                  </View>
                  <View style={styles.reportDetailItem}>
                    <Text style={styles.reportDetailLabel}>Class Rank</Text>
                    <Text style={styles.reportDetailValue}>#{selectedReport.rank}</Text>
                  </View>
                </View>
              </Card>

              <Button
                title="Download Report Card"
                onPress={() => {
                  Alert.alert(
                    'Download Report Card',
                    'Report card download functionality will be implemented in the next phase.',
                    [{ text: 'OK' }]
                  );
                }}
                style={styles.downloadFullButton}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  selectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  childChip: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  childChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  childChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  childChipTextActive: {
    color: '#FFFFFF',
  },
  childChipSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  childChipSubtextActive: {
    color: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  childInfoCard: {
    marginBottom: 16,
    paddingVertical: 16,
  },
  childInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  childInfoDetails: {
    fontSize: 14,
    color: '#64748B',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  examCard: {
    marginBottom: 16,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examInfo: {
    flex: 1,
  },
  examSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  examGroup: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  examDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  resultSection: {
    paddingTop: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  marksText: {
    color: '#059669',
    fontWeight: '600',
  },
  gradeText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  reportCard: {
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    color: '#64748B',
  },
  downloadButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  reportDetails: {
    marginTop: 8,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  reportDetailsCard: {
    marginBottom: 20,
  },
  reportDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  reportDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportDetailItem: {
    width: '48%',
    marginBottom: 16,
  },
  reportDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  reportDetailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  downloadFullButton: {
    backgroundColor: '#059669',
  },
});

export { ParentExamsScreen };
