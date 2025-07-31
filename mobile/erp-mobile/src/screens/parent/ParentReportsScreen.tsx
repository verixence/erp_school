import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  RefreshControl, 
  TouchableOpacity,
  Alert,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  TrendingUp,
  Award,
  BookOpen,
  BarChart3,
  User,
  GraduationCap,
  Clock,
  CheckCircle,
  ExternalLink
} from 'lucide-react-native';

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

  // Fetch report cards for selected child
  const { data: reportCards = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['student-reports', selectedChild],
    queryFn: async (): Promise<ReportCard[]> => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
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

      if (error) throw error;

      return (data || []).map((report: any) => ({
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
      <Card key={report.id} className="mb-4">
        <CardContent className="p-4">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: typeColor + '20' }}
                >
                  <ReportIcon size={20} color={typeColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {report.title}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600">
                      {report.academic_year}
                    </Text>
                    {report.term && (
                      <Text className="text-sm text-gray-600"> • {report.term}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
            
            <View 
              className="px-2 py-1 rounded-full flex-row items-center"
              style={{ backgroundColor: statusColor + '20' }}
            >
              <StatusIcon size={12} color={statusColor} />
              <Text 
                className="text-xs font-medium capitalize ml-1"
                style={{ color: statusColor }}
              >
                {report.status}
              </Text>
            </View>
          </View>

          {/* Summary Stats */}
          {report.summary && (
            <View className="bg-gray-50 p-3 rounded-lg mb-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <BarChart3 size={14} color="#6b7280" />
                    <Text className="text-sm font-medium text-gray-700 ml-1">
                      Average: {report.summary.average_marks.toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Award size={14} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-1">
                      Grade: {report.summary.grade}
                    </Text>
                    {report.summary.rank && (
                      <Text className="text-sm text-gray-600"> • Rank: {report.summary.rank}</Text>
                    )}
                  </View>
                </View>
                
                <View className="items-end">
                  <Text className="text-sm font-medium text-gray-700">
                    {report.summary.total_subjects} Subjects
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {report.summary.attendance_percentage}% Attendance
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Footer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Calendar size={14} color="#6b7280" />
              <Text className="text-sm text-gray-500 ml-1">
                Generated {formatDate(report.generated_at)}
              </Text>
            </View>
            
            <View className="flex-row items-center space-x-2">
              {report.file_url && report.status !== 'draft' && (
                <>
                  <TouchableOpacity
                    onPress={() => handleViewReport(report)}
                    className="bg-blue-600 px-3 py-1 rounded-lg flex-row items-center"
                  >
                    <Eye size={14} color="white" />
                    <Text className="text-white ml-1 text-sm font-medium">View</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleDownloadReport(report)}
                    className="bg-green-600 px-3 py-1 rounded-lg flex-row items-center"
                  >
                    <Download size={14} color="white" />
                    <Text className="text-white ml-1 text-sm font-medium">Download</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {report.status === 'draft' && (
                <View className="bg-gray-200 px-3 py-1 rounded-lg">
                  <Text className="text-gray-600 text-sm font-medium">Preparing...</Text>
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
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900 mb-3">Report Cards</Text>
        
        {/* Child Selector */}
        {children.length > 1 && (
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Select Child:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  className={`mr-2 px-3 py-2 rounded-lg ${
                    selectedChild === child.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    selectedChild === child.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {child.full_name}
                  </Text>
                  <Text className={`text-xs ${
                    selectedChild === child.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    Grade {child.grade}-{child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Report Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
              className={`mr-2 px-3 py-2 rounded-lg ${
                reportTypeFilter === filter.key ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                reportTypeFilter === filter.key ? 'text-white' : 'text-gray-700'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="py-4">
          {filteredReports.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <FileText size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4">
                {reportTypeFilter === 'all' 
                  ? 'No report cards available yet'
                  : `No ${reportTypeFilter} reports available`
                }
              </Text>
              <Text className="text-gray-400 text-center mt-2 text-sm">
                Reports will appear here once they are generated by the school
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Stats */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-3">
                    Report Summary
                  </Text>
                  <View className="flex-row justify-between">
                    <View className="items-center">
                      <Text className="text-2xl font-bold text-blue-600">
                        {filteredReports.length}
                      </Text>
                      <Text className="text-sm text-gray-600">Total Reports</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-2xl font-bold text-green-600">
                        {filteredReports.filter(r => r.status === 'finalized').length}
                      </Text>
                      <Text className="text-sm text-gray-600">Finalized</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-2xl font-bold text-orange-600">
                        {filteredReports.filter(r => r.status === 'draft').length}
                      </Text>
                      <Text className="text-sm text-gray-600">In Progress</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Report Cards */}
              {filteredReports.map(renderReportCard)}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
