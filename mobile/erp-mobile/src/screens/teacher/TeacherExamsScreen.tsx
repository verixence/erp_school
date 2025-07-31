import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  Calendar,
  Clock,
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit3,
  MapPin,
  BookOpen,
  FileText,
  GraduationCap
} from 'lucide-react-native';

interface Exam {
  id: string;
  exam_name: string;
  subject: string;
  section: string;
  grade: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  venue: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  max_marks: number;
  instructions?: string;
  marks_entered: boolean;
  total_students: number;
  marks_completed: number;
  created_at: string;
}

const TeacherExamsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'ongoing' | 'completed'>('all');

  // Helper function to determine exam status
  const getExamStatus = (exam: any): 'scheduled' | 'ongoing' | 'completed' | 'cancelled' => {
    const now = new Date();
    const examDate = new Date(exam.exam_date);
    const examTime = new Date(`${exam.exam_date}T${exam.exam_time}`);
    const examEndTime = new Date(examTime.getTime() + (exam.duration_minutes * 60000));

    if (now < examTime) return 'scheduled';
    if (now >= examTime && now <= examEndTime) return 'ongoing';
    if (now > examEndTime) return 'completed';
    
    return 'scheduled';
  };

  // Fetch exams for this teacher
  const { data: exams = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async (): Promise<Exam[]> => {
      if (!user?.id) return [];

      const { data: examData, error } = await supabase
        .from('exam_papers')
        .select(`
          id,
          subject,
          section,
          exam_date,
          exam_time,
          duration_minutes,
          venue,
          max_marks,
          instructions,
          created_at,
          teacher_id,
          school_id,
          exam_groups(
            name,
            exam_type,
            start_date,
            end_date,
            is_published
          ),
          teachers!inner(
            user_id
          )
        `)
        .eq('school_id', user.school_id)
        .eq('teachers.user_id', user.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      // Get marks statistics for each exam
      const examsWithMarks = await Promise.all(
        (examData || []).map(async (exam: any) => {
          // Get total students and marks completion
          const { data: marksData } = await supabase
            .from('marks')
            .select(`
              id,
              marks_obtained,
              is_absent,
              student_id
            `)
            .eq('exam_paper_id', exam.id);

          const totalStudents = marksData?.length || 0;
          const marksCompleted = marksData?.filter(mark => 
            mark.marks_obtained !== null || mark.is_absent
          ).length || 0;

          const status = getExamStatus(exam);
          
          // Parse grade and section from the section text field
          const sectionText = exam.section || '';
          const gradeMatch = sectionText.match(/(\d+)/);
          const grade = gradeMatch ? parseInt(gradeMatch[1]) : 0;

          return {
            id: exam.id,
            exam_name: exam.exam_groups?.name || `${exam.subject} Exam`,
            subject: exam.subject,
            section: sectionText,
            grade: grade,
            date: exam.exam_date,
            start_time: exam.exam_time,
            duration_minutes: exam.duration_minutes,
            venue: exam.venue || 'TBA',
            status,
            max_marks: exam.max_marks,
            instructions: exam.instructions,
            marks_entered: totalStudents > 0,
            total_students: totalStudents,
            marks_completed: marksCompleted,
            created_at: exam.created_at
          };
        })
      );

      return examsWithMarks as Exam[];
    },
    enabled: !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredExams = exams.filter(exam => {
    if (statusFilter === 'all') return true;
    return exam.status === statusFilter;
  });

  const getExamStats = () => {
    const total = exams.length;
    const scheduled = exams.filter(e => e.status === 'scheduled').length;
    const completed = exams.filter(e => e.status === 'completed').length;
    const ongoing = exams.filter(e => e.status === 'ongoing').length;

    return { total, scheduled, completed, ongoing };
  };

  const stats = getExamStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'ongoing': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return Calendar;
      case 'ongoing': return Clock;
      case 'completed': return CheckCircle;
      case 'cancelled': return AlertCircle;
      default: return Calendar;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEnterMarks = (exam: Exam) => {
    // Navigate to marks entry screen
    (navigation as any).navigate('AcademicsTab', { 
      screen: 'Marks',
      params: { examId: exam.id, examDetails: exam }
    });
  };

  const handleViewDetails = (exam: Exam) => {
    Alert.alert(
      'Exam Details',
      `Subject: ${exam.subject}\nSection: Grade ${exam.grade} ${exam.section}\nDate: ${formatDate(exam.date)}\nTime: ${formatTime(exam.start_time)}\nDuration: ${exam.duration_minutes} mins\nVenue: ${exam.venue}\nMax Marks: ${exam.max_marks}${exam.instructions ? `\n\nInstructions: ${exam.instructions}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#3b82f6' + '15' }]}>
          <FileText size={20} color="#3b82f6" />
        </View>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total Exams</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#f59e0b' + '15' }]}>
          <Calendar size={20} color="#f59e0b" />
        </View>
        <Text style={styles.statNumber}>{stats.scheduled}</Text>
        <Text style={styles.statLabel}>Scheduled</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#10b981' + '15' }]}>
          <Clock size={20} color="#10b981" />
        </View>
        <Text style={styles.statNumber}>{stats.ongoing}</Text>
        <Text style={styles.statLabel}>Ongoing</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#6b7280' + '15' }]}>
          <CheckCircle size={20} color="#6b7280" />
        </View>
        <Text style={styles.statNumber}>{stats.completed}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {(['all', 'scheduled', 'ongoing', 'completed'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            statusFilter === filter && styles.activeFilter
          ]}
          onPress={() => setStatusFilter(filter)}
        >
          <Text style={[
            styles.filterText,
            statusFilter === filter && styles.activeFilterText
          ]}>
            {filter === 'all' ? 'All Status' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderExamCard = (exam: Exam) => {
    const StatusIcon = getStatusIcon(exam.status);
    const statusColor = getStatusColor(exam.status);
    const marksProgress = exam.total_students > 0 ? (exam.marks_completed / exam.total_students) * 100 : 0;
    
    return (
      <View key={exam.id} style={styles.examCard}>
        {/* Header */}
        <View style={styles.examHeader}>
          <View style={styles.examTitleContainer}>
            <Text style={styles.examTitle}>{exam.exam_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <StatusIcon size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {exam.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Subject and Section */}
        <View style={styles.examSubInfo}>
          <View style={styles.infoRow}>
            <BookOpen size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {exam.subject} • Grade {exam.grade} {exam.section}
            </Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.examDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#6b7280" />
            <Text style={styles.detailText}>{formatDate(exam.date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatTime(exam.start_time)} ({exam.duration_minutes} mins)
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color="#6b7280" />
            <Text style={styles.detailText}>{exam.venue}</Text>
          </View>
          <View style={styles.detailRow}>
            <Award size={16} color="#6b7280" />
            <Text style={styles.detailText}>{exam.max_marks} marks</Text>
          </View>
        </View>

        {/* Marks Entry Status */}
        {exam.status === 'completed' && (
          <View style={styles.marksStatus}>
            <View style={styles.marksProgress}>
              <Text style={styles.marksProgressLabel}>
                Marks Entry Progress
              </Text>
              {exam.marks_entered ? (
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {exam.marks_completed}/{exam.total_students} students
                  </Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${marksProgress}%`,
                          backgroundColor: marksProgress === 100 ? '#10b981' : '#f59e0b'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[
                    styles.progressPercentage,
                    { color: marksProgress === 100 ? '#10b981' : '#f59e0b' }
                  ]}>
                    {Math.round(marksProgress)}%
                  </Text>
                </View>
              ) : (
                <Text style={styles.noMarksText}>No marks entered yet</Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.examActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewDetails(exam)}
          >
            <Eye size={16} color="#6b7280" />
            <Text style={styles.actionText}>View Details</Text>
          </TouchableOpacity>

          {exam.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => handleEnterMarks(exam)}
            >
              <Edit3 size={16} color="#fff" />
              <Text style={[styles.actionText, styles.primaryActionText]}>
                {exam.marks_entered ? 'Update Marks' : 'Enter Marks'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Completion Status Badge */}
        {exam.status === 'completed' && exam.marks_entered && marksProgress === 100 && (
          <View style={styles.completionBadge}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.completionText}>Marks Entry Complete</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading exams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Exam Management</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Filter Buttons */}
        {renderFilterButtons()}

        {/* Exams List */}
        {filteredExams.length > 0 ? (
          <View style={styles.examsList}>
            {filteredExams.map(renderExamCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <GraduationCap size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {statusFilter === 'all' ? 'No Exams Found' : `No ${statusFilter} Exams`}
            </Text>
            <Text style={styles.emptySubtext}>
              {statusFilter === 'all' 
                ? 'No exams are scheduled for your sections yet.'
                : `There are no ${statusFilter} exams for your sections.`
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#fff',
  },
  examsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examHeader: {
    marginBottom: 12,
  },
  examTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  examTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  examSubInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  examDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  marksStatus: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  marksProgress: {
    gap: 8,
  },
  marksProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressInfo: {
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  noMarksText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  examActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 4,
  },
  primaryAction: {
    backgroundColor: '#3b82f6',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  primaryActionText: {
    color: '#fff',
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10b981' + '15',
    marginTop: 12,
    gap: 4,
  },
  completionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TeacherExamsScreen;
