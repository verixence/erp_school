import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface ExamGroup {
  id: string;
  name: string;
  description: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
}

interface ExamPaper {
  id: string;
  subject: string;
  section: string;
  exam_date: string;
  exam_time: string;
  duration_minutes: number;
  max_marks: number;
  venue: string;
  exam_groups: {
    name: string;
    exam_type: string;
  };
}

interface Section {
  id: string;
  grade: number;
  section: string;
}

const TeacherExamsScreen: React.FC = () => {
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'papers' | 'marks'>('papers');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  // Fetch exam groups
  const { data: examGroups = [], isLoading: examGroupsLoading } = useQuery({
    queryKey: ['exam-groups'],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', profile.user.user_metadata.school_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExamGroup[];
    }
  });

  // Fetch exam papers for teacher
  const { data: examPapers = [], isLoading: examPapersLoading } = useQuery({
    queryKey: ['teacher-exam-papers'],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups(name, exam_type),
          teachers!inner(user_id)
        `)
        .eq('teachers.user_id', profile.user.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data as ExamPaper[];
    }
  });

     // Fetch teacher sections
   const { data: sections = [] } = useQuery({
     queryKey: ['teacher-sections'],
     queryFn: async () => {
       const { data: profile } = await supabase.auth.getUser();
       if (!profile.user) throw new Error('Not authenticated');

       const { data, error } = await supabase
         .from('teacher_sections')
         .select(`
           sections(id, grade, section)
         `)
         .eq('teacher_id', profile.user.id);

       if (error) throw error;
       return data
         .map((ts: any) => ts.sections)
         .filter((section: any) => section !== null && section !== undefined) as Section[];
     }
   });

  const filteredExamPapers = examPapers.filter(paper => {
    const matchesSearch = paper.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         paper.section.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = !selectedExamGroup || paper.exam_groups?.name === selectedExamGroup;
    return matchesSearch && matchesGroup;
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['exam-groups'] });
    await queryClient.invalidateQueries({ queryKey: ['teacher-exam-papers'] });
    setRefreshing(false);
  };

  const renderExamPaper = ({ item }: { item: ExamPaper }) => {
    const status = getExamStatus(item.exam_date, item.exam_time);
    const statusColor = getStatusColor(status);

    return (
      <Card style={styles.examPaperCard}>
        <View style={styles.examPaperHeader}>
          <View style={styles.examPaperInfo}>
            <Text style={styles.examSubject}>{item.subject}</Text>
            <Text style={styles.examSection}>Grade {item.section}</Text>
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
        </View>

        {status === 'completed' && (
          <Button
            title="Enter Marks"
            onPress={() => {
              setSelectedPaper(item);
              setShowMarksModal(true);
            }}
            style={styles.enterMarksButton}
          />
        )}
      </Card>
    );
  };

  const renderExamGroupFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedExamGroup && styles.filterChipActive]}
          onPress={() => setSelectedExamGroup('')}
        >
          <Text style={[styles.filterChipText, !selectedExamGroup && styles.filterChipTextActive]}>
            All Groups
          </Text>
        </TouchableOpacity>
        {examGroups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[styles.filterChip, selectedExamGroup === group.name && styles.filterChipActive]}
            onPress={() => setSelectedExamGroup(group.name)}
          >
            <Text style={[styles.filterChipText, selectedExamGroup === group.name && styles.filterChipTextActive]}>
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exam Management</Text>
        <Text style={styles.headerSubtitle}>View exam schedules and enter marks</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'papers' && styles.activeTab]}
          onPress={() => setActiveTab('papers')}
        >
          <Text style={[styles.tabText, activeTab === 'papers' && styles.activeTabText]}>
            Exam Papers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'marks' && styles.activeTab]}
          onPress={() => setActiveTab('marks')}
        >
          <Text style={[styles.tabText, activeTab === 'marks' && styles.activeTabText]}>
            Marks Entry
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <Input
          placeholder="Search by subject or section..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />

        {/* Exam Group Filter */}
        {renderExamGroupFilter()}

        {/* Exam Papers List */}
        <FlatList
          data={filteredExamPapers}
          renderItem={renderExamPaper}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exam papers found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search criteria' : 'Exam papers will appear here when scheduled'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Marks Entry Modal */}
      <Modal
        visible={showMarksModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Marks</Text>
            <TouchableOpacity onPress={() => setShowMarksModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {selectedPaper && (
            <View style={styles.modalContent}>
              <Card style={styles.examInfoCard}>
                <Text style={styles.examInfoTitle}>{selectedPaper.subject}</Text>
                <Text style={styles.examInfoDetails}>
                  Grade {selectedPaper.section} • {formatDate(selectedPaper.exam_date)}
                </Text>
                <Text style={styles.examInfoDetails}>
                  Max Marks: {selectedPaper.max_marks}
                </Text>
              </Card>

              <Text style={styles.marksNote}>
                Marks entry functionality will be implemented in the next phase. 
                This would include student list, marks input, and validation.
              </Text>
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
  searchInput: {
    marginBottom: 16,
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
  examPaperCard: {
    marginBottom: 16,
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
  examSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  examSection: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
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
    marginBottom: 16,
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
  enterMarksButton: {
    backgroundColor: '#10B981',
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
  examInfoCard: {
    marginBottom: 20,
  },
  examInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  examInfoDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  marksNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default TeacherExamsScreen;
