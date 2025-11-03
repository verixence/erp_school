import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  Award,
  BookOpen,
  BarChart3,
  GraduationCap,
  Clock,
  CheckCircle
} from 'lucide-react-native';
import { schoolTheme } from '../../theme/schoolTheme';

interface ReportCard {
  id: string;
  title: string;
  type: 'term' | 'annual' | 'progress' | 'exam' | 'co_scholastic';
  academic_year: string;
  term?: string;
  generated_at: string;
  status: 'draft' | 'published' | 'finalized';
  file_url?: string;
  student: {
    full_name: string;
    grade: number;
    section: string;
    admission_no: string;
  };
  summary?: {
    total_subjects: number;
    average_marks: number;
    grade: string;
    rank?: number;
    attendance_percentage: number;
  };
  // State Board specific fields
  isStateBoard?: boolean;
  stateBoardData?: {
    report_type: string;
    assessment_number: number;
    total_marks: number;
    obtained_marks: number;
    percentage: number;
    overall_grade?: string;
    overall_remark?: string;
    subject_marks: any[];
  };
}

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  grade: number;
  section: string;
}

export const ParentReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');

  // Fetch parent's children
  const { data: children = [], isLoading: childrenLoading } = useQuery({
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
            grade,
            section
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        grade: item.students.grade,
        section: item.students.section
      }));
    },
    enabled: !!user?.id,
  });

  // Set default child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch both report cards and State Board reports for selected child
  const { data: reportCards = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['student-reports', selectedChild],
    queryFn: async (): Promise<ReportCard[]> => {
      if (!selectedChild) return [];

      // Fetch CBSE report cards
      const { data: cbseData, error: cbseError } = await supabase
        .from('report_cards')
        .select(`
          id,
          title,
          type,
          academic_year,
          term,
          generated_at,
          status,
          file_url,
          student:students!student_id(full_name, grade, section, admission_no),
          report_summary:report_summaries(
            total_subjects,
            average_marks,
            grade,
            rank,
            attendance_percentage
          )
        `)
        .eq('student_id', selectedChild)
        .order('generated_at', { ascending: false });

      if (cbseError) console.error('CBSE reports error:', cbseError);

      // Fetch State Board reports
      const { data: stateBoardData, error: stateBoardError } = await supabase
        .from('state_board_reports')
        .select(`
          id,
          report_type,
          assessment_number,
          academic_year,
          generated_at,
          status,
          is_published,
          total_marks,
          obtained_marks,
          percentage,
          overall_grade,
          overall_remark,
          subject_marks
        `)
        .eq('student_id', selectedChild)
        .eq('is_published', true)
        .order('generated_at', { ascending: false });

      if (stateBoardError) console.error('State Board reports error:', stateBoardError);

      // Combine both report types
      const cbseReports = (cbseData || []).map((report: any) => ({
        id: report.id,
        title: report.title,
        type: report.type,
        academic_year: report.academic_year,
        term: report.term,
        generated_at: report.generated_at,
        status: report.status,
        file_url: report.file_url,
        student: report.student,
        summary: report.report_summary?.[0]
      }));

      const stateBoardReports = (stateBoardData || []).map((report: any) => ({
        id: report.id,
        title: `${report.report_type}-${report.assessment_number} Progress Report`,
        type: 'progress',
        academic_year: report.academic_year,
        term: undefined,
        generated_at: report.generated_at,
        status: report.is_published ? 'published' : 'draft',
        file_url: undefined, // State Board reports are generated on-the-fly
        student: { full_name: '', grade: 0, section: '', admission_no: '' },
        summary: {
          total_subjects: report.subject_marks?.length || 0,
          average_marks: report.percentage || 0,
          grade: report.overall_grade || '',
          rank: undefined,
          attendance_percentage: 0
        },
        // Add State Board specific data
        isStateBoard: true,
        stateBoardData: report
      }));

      // Merge and sort by date
      return [...cbseReports, ...stateBoardReports].sort((a, b) =>
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      );
    },
    enabled: !!selectedChild,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchReports();
    setRefreshing(false);
  };

  const filteredReports = reportCards.filter(report => {
    if (reportTypeFilter === 'all') return true;
    return report.type === reportTypeFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'term': return BookOpen;
      case 'annual': return Award;
      case 'progress': return TrendingUp;
      case 'exam': return FileText;
      case 'co_scholastic': return GraduationCap;
      default: return FileText;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'term': return '#3b82f6';
      case 'annual': return '#f59e0b';
      case 'progress': return '#10b981';
      case 'exam': return '#8b5cf6';
      case 'co_scholastic': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6b7280';
      case 'published': return '#3b82f6';
      case 'finalized': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return Clock;
      case 'published': return Eye;
      case 'finalized': return CheckCircle;
      default: return Clock;
    }
  };

  const handleDownloadReport = async (report: ReportCard) => {
    if (!report.file_url) {
      Alert.alert('Error', 'Report file is not available for download');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(report.file_url);
      if (supported) {
        await Linking.openURL(report.file_url);
      } else {
        Alert.alert('Error', 'Cannot open report file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download report. Please try again.');
    }
  };

  const handleViewReport = async (report: ReportCard) => {
    // For State Board reports, show message that they need to view from web portal
    if (report.isStateBoard) {
      Alert.alert(
        'View Report',
        'State Board reports can be viewed from the web portal. Please login to the parent portal on your computer to view and download this report.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!report.file_url) {
      Alert.alert('Error', 'Report is not yet available for viewing');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(report.file_url);
      if (supported) {
        await Linking.openURL(report.file_url);
      } else {
        Alert.alert('Error', 'Cannot open report file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open report. Please try again.');
    }
  };

  const renderReportCard = (report: ReportCard) => {
    const ReportIcon = getReportTypeIcon(report.type);
    const StatusIcon = getStatusIcon(report.status);
    const typeColor = getReportTypeColor(report.type);
    const statusColor = getStatusColor(report.status);

    return (
      <Card key={report.id} style={styles.reportCard}>
        <CardContent style={styles.cardContent}>
          {/* Header */}
          <View style={styles.reportHeader}>
            <View style={styles.reportHeaderLeft}>
              <View style={[styles.typeIconContainer, { backgroundColor: typeColor + '20' }]}>
                <ReportIcon size={24} color={typeColor} />
              </View>
              <View style={styles.reportHeaderText}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <View style={styles.reportMeta}>
                  <Text style={styles.academicYear}>{report.academic_year}</Text>
                  {report.term && (
                    <Text style={styles.term}> • {report.term}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <StatusIcon size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {report.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Summary Stats */}
          {report.summary && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <View style={styles.summaryItem}>
                    <BarChart3 size={14} color="#6b7280" />
                    <Text style={styles.summaryText}>
                      Average: {report.summary.average_marks.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Award size={14} color="#6b7280" />
                    <Text style={styles.summaryText}>
                      Grade: {report.summary.grade}
                    </Text>
                    {report.summary.rank && (
                      <Text style={styles.summaryText}> • Rank: {report.summary.rank}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.summaryRight}>
                  <Text style={styles.summaryValue}>
                    {report.summary.total_subjects} Subjects
                  </Text>
                  <Text style={styles.summarySecondary}>
                    {report.summary.attendance_percentage}% Attendance
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.reportFooter}>
            <View style={styles.dateContainer}>
              <Calendar size={14} color="#6b7280" />
              <Text style={styles.dateText}>
                Generated {formatDate(report.generated_at)}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              {report.isStateBoard ? (
                <TouchableOpacity
                  onPress={() => handleViewReport(report)}
                  style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                >
                  <Eye size={14} color="white" />
                  <Text style={styles.actionButtonText}>View on Web</Text>
                </TouchableOpacity>
              ) : report.file_url && report.status !== 'draft' ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleViewReport(report)}
                    style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                  >
                    <Eye size={14} color="white" />
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDownloadReport(report)}
                    style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  >
                    <Download size={14} color="white" />
                    <Text style={styles.actionButtonText}>Download</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftText}>Preparing...</Text>
                </View>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  if (childrenLoading || reportsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <FileText size={24} color={schoolTheme.colors.parent.main} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Report Cards</Text>
            <Text style={styles.headerSubtitle}>View your child's academic progress</Text>
          </View>
        </View>

        {/* Child Selector */}
        {children.length > 1 && (
          <View style={styles.childSelectorSection}>
            <Text style={styles.sectionLabel}>Select Child:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.childScroll}
            >
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  style={[
                    styles.childButton,
                    selectedChild === child.id && styles.childButtonActive
                  ]}
                >
                  <Text style={[
                    styles.childButtonText,
                    selectedChild === child.id && styles.childButtonTextActive
                  ]}>
                    {child.full_name}
                  </Text>
                  <Text style={[
                    styles.childButtonGrade,
                    selectedChild === child.id && styles.childButtonGradeActive
                  ]}>
                    Grade {child.grade}-{child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Report Type Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {[
            { key: 'all', label: 'All Reports' },
            { key: 'term', label: 'Term Reports' },
            { key: 'annual', label: 'Annual Reports' },
            { key: 'progress', label: 'Progress Reports' },
            { key: 'exam', label: 'Exam Reports' },
            { key: 'co_scholastic', label: 'Co-Scholastic' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setReportTypeFilter(filter.key)}
              style={[
                styles.filterButton,
                reportTypeFilter === filter.key && styles.filterButtonActive
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                reportTypeFilter === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>
              {reportTypeFilter === 'all'
                ? 'No report cards available yet'
                : `No ${reportTypeFilter} reports available`
              }
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              Reports will appear here once they are generated by the school
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <Card style={styles.summaryCard}>
              <CardContent style={styles.summaryCardContent}>
                <Text style={styles.summaryCardTitle}>Report Summary</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#3b82f6' }]}>
                      {filteredReports.length}
                    </Text>
                    <Text style={styles.statLabel}>Total Reports</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#10b981' }]}>
                      {filteredReports.filter(r => r.status === 'finalized').length}
                    </Text>
                    <Text style={styles.statLabel}>Finalized</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
                      {filteredReports.filter(r => r.status === 'draft').length}
                    </Text>
                    <Text style={styles.statLabel}>In Progress</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Report Cards */}
            {filteredReports.map(renderReportCard)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...schoolTheme.shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  childSelectorSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  childScroll: {
    marginBottom: 4,
  },
  childButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  childButtonActive: {
    backgroundColor: schoolTheme.colors.parent.main,
  },
  childButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  childButtonTextActive: {
    color: 'white',
  },
  childButtonGrade: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  childButtonGradeActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  filterScroll: {
    marginTop: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: schoolTheme.colors.parent.main,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryCardContent: {
    padding: 20,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  reportCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportHeaderText: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  academicYear: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  term: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
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
    fontSize: 11,
    fontWeight: '600',
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  summaryContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  summarySecondary: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  draftBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  draftText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
});
