import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/Card';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Clock,
  Target,
  Award,
  Activity,
  Calendar,
  ChevronDown,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

interface GradeData {
  subject: string;
  average: number;
  trend: 'up' | 'down' | 'stable';
  studentCount: number;
  highestScore: number;
  lowestScore: number;
}

interface ClassPerformance {
  section: string;
  grade: number;
  totalStudents: number;
  averageAttendance: number;
  averageGrade: number;
  subjectPerformance: Array<{
    subject: string;
    average: number;
    passing: number;
  }>;
}

interface AnalyticsStats {
  totalStudents: number;
  averageAttendance: number;
  averageGrade: number;
  attendanceTrend: 'up' | 'down' | 'stable';
  gradeTrend: 'up' | 'down' | 'stable';
  topPerformingSubject: string;
  needsAttentionCount: number;
}

const TIME_PERIODS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' }
];

export const TeacherAnalyticsScreen = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedAnalytic, setSelectedAnalytic] = useState<'attendance' | 'grades' | 'performance'>('attendance');

  // Fetch teacher sections
  const { data: sections = [] } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('teacher_sections')
        .select(`
          sections!inner(
            id,
            name,
            grade,
            school_id
          )
        `)
        .eq('teacher_id', user.id);

      if (error) throw error;
      return data?.map(ts => ts.sections) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['teacher-analytics', user?.id, selectedPeriod],
    queryFn: async () => {
      if (!user?.id || sections.length === 0) return null;

      // Mock analytics data since complex analytics queries might not exist
      const mockStats: AnalyticsStats = {
        totalStudents: 156,
        averageAttendance: 94.2,
        averageGrade: 78.5,
        attendanceTrend: 'up',
        gradeTrend: 'stable',
        topPerformingSubject: 'Mathematics',
        needsAttentionCount: 12
      };

      const mockAttendanceData: AttendanceData[] = [
        { date: '2024-01-08', present: 28, absent: 2, late: 1, total: 31, percentage: 90.3 },
        { date: '2024-01-09', present: 30, absent: 1, late: 0, total: 31, percentage: 96.8 },
        { date: '2024-01-10', present: 29, absent: 1, late: 1, total: 31, percentage: 93.5 },
        { date: '2024-01-11', present: 31, absent: 0, late: 0, total: 31, percentage: 100.0 },
        { date: '2024-01-12', present: 28, absent: 2, late: 1, total: 31, percentage: 90.3 }
      ];

      const mockGradeData: GradeData[] = [
        { subject: 'Mathematics', average: 82.4, trend: 'up', studentCount: 31, highestScore: 98, lowestScore: 65 },
        { subject: 'Science', average: 79.6, trend: 'stable', studentCount: 31, highestScore: 95, lowestScore: 62 },
        { subject: 'English', average: 75.8, trend: 'down', studentCount: 31, highestScore: 92, lowestScore: 58 },
        { subject: 'History', average: 81.2, trend: 'up', studentCount: 31, highestScore: 96, lowestScore: 68 }
      ];

      const mockClassPerformance: ClassPerformance[] = [
        {
          section: 'A',
          grade: 8,
          totalStudents: 31,
          averageAttendance: 94.2,
          averageGrade: 78.5,
          subjectPerformance: [
            { subject: 'Math', average: 82.4, passing: 28 },
            { subject: 'Science', average: 79.6, passing: 26 },
            { subject: 'English', average: 75.8, passing: 24 }
          ]
        },
        {
          section: 'B',
          grade: 8,
          totalStudents: 30,
          averageAttendance: 91.8,
          averageGrade: 76.2,
          subjectPerformance: [
            { subject: 'Math', average: 79.8, passing: 25 },
            { subject: 'Science', average: 77.4, passing: 24 },
            { subject: 'English', average: 72.6, passing: 22 }
          ]
        }
      ];

      return {
        stats: mockStats,
        attendanceData: mockAttendanceData,
        gradeData: mockGradeData,
        classPerformance: mockClassPerformance
      };
    },
    enabled: !!user?.id && sections.length > 0,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} color="#10b981" />;
      case 'down':
        return <TrendingDown size={16} color="#ef4444" />;
      default:
        return <Activity size={16} color="#6b7280" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getSelectedPeriodLabel = () => {
    return TIME_PERIODS.find(p => p.value === selectedPeriod)?.label || 'This Month';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = analyticsData?.stats;
  const attendanceData = analyticsData?.attendanceData || [];
  const gradeData = analyticsData?.gradeData || [];
  const classPerformance = analyticsData?.classPerformance || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{ 
        backgroundColor: 'white', 
        paddingHorizontal: 24, 
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: '#3b82f6', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <BarChart3 size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                Teaching Analytics
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Performance insights and trends
              </Text>
            </View>
          </View>
        </View>

        {/* Period Filter */}
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f3f4f6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8
            }}
            onPress={() => setShowPeriodModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={16} color="#6b7280" />
              <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
                {getSelectedPeriodLabel()}
              </Text>
            </View>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Overview Stats */}
        {stats && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Overview
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Users size={20} color="#3b82f6" />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6', marginLeft: 8 }}>
                    {stats.totalStudents}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Total Students
                </Text>
              </Card>
              
              <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981', marginLeft: 8 }}>
                    {formatPercentage(stats.averageAttendance)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Avg Attendance
                </Text>
              </Card>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Award size={20} color="#f59e0b" />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b', marginLeft: 8 }}>
                    {stats.averageGrade.toFixed(1)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Avg Grade
                </Text>
              </Card>
              
              <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444', marginLeft: 8 }}>
                    {stats.needsAttentionCount}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Need Attention
                </Text>
              </Card>
            </View>
          </View>
        )}

        {/* Analytics Tabs */}
        <View style={{ marginBottom: 24 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { key: 'attendance', label: 'Attendance', icon: Clock },
                { key: 'grades', label: 'Grades', icon: BookOpen },
                { key: 'performance', label: 'Performance', icon: Target }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedAnalytic === tab.key ? '#3b82f6' : '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    minWidth: 100
                  }}
                  onPress={() => setSelectedAnalytic(tab.key as any)}
                >
                  <tab.icon 
                    size={16} 
                    color={selectedAnalytic === tab.key ? 'white' : '#6b7280'} 
                  />
                  <Text style={{
                    marginLeft: 6,
                    color: selectedAnalytic === tab.key ? 'white' : '#6b7280',
                    fontWeight: selectedAnalytic === tab.key ? '600' : '400',
                    fontSize: 14
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Attendance Analytics */}
        {selectedAnalytic === 'attendance' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Attendance Trends
            </Text>
            
            {/* Attendance Chart Placeholder */}
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                Daily Attendance Rate
              </Text>
              <View style={{ height: 200, backgroundColor: '#f9fafb', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                <BarChart3 size={48} color="#6b7280" />
                <Text style={{ color: '#6b7280', marginTop: 8 }}>Chart visualization</Text>
              </View>
            </Card>

            {/* Recent Attendance Data */}
            <Card style={{ padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                Recent Attendance
              </Text>
              {attendanceData.slice(0, 5).map((data, index) => (
                <View key={index} style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: index < 4 ? 1 : 0,
                  borderBottomColor: '#f3f4f6'
                }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>
                    {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {data.present}/{data.total}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '600',
                      color: data.percentage >= 95 ? '#10b981' : data.percentage >= 85 ? '#f59e0b' : '#ef4444'
                    }}>
                      {formatPercentage(data.percentage)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Grade Analytics */}
        {selectedAnalytic === 'grades' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Subject Performance
            </Text>
            
            {gradeData.map((grade, index) => (
              <Card key={index} style={{ padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    {grade.subject}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {getTrendIcon(grade.trend)}
                    <Text style={{ 
                      fontSize: 18, 
                      fontWeight: 'bold', 
                      color: getTrendColor(grade.trend),
                      marginLeft: 4 
                    }}>
                      {grade.average.toFixed(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Students: {grade.studentCount}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Range: {grade.lowestScore} - {grade.highestScore}
                  </Text>
                </View>
                
                {/* Grade Distribution Bar */}
                <View style={{ height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    width: `${(grade.average / 100) * 100}%`,
                    backgroundColor: grade.average >= 80 ? '#10b981' : grade.average >= 70 ? '#f59e0b' : '#ef4444'
                  }} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Class Performance */}
        {selectedAnalytic === 'performance' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Class Performance
            </Text>
            
            {classPerformance.map((classData, index) => (
              <Card key={index} style={{ padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    Grade {classData.grade} - Section {classData.section}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    {classData.totalStudents} students
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6' }}>
                      {formatPercentage(classData.averageAttendance)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Attendance</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>
                      {classData.averageGrade.toFixed(1)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Avg Grade</Text>
                  </View>
                </View>
                
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  Subject Performance
                </Text>
                {classData.subjectPerformance.map((subject, subIndex) => (
                  <View key={subIndex} style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    paddingVertical: 4
                  }}>
                    <Text style={{ fontSize: 14, color: '#111827' }}>{subject.subject}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>
                        {subject.passing}/{classData.totalStudents} passing
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                        {subject.average.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Period Selector Modal */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderRadius: 12,
            padding: 24,
            width: '80%',
            maxWidth: 300
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Select Time Period
            </Text>
            {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedPeriod === period.value ? '#3b82f6' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedPeriod(period.value);
                  setShowPeriodModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedPeriod === period.value ? '#3b82f6' : '#111827',
                  fontWeight: selectedPeriod === period.value ? '600' : '400'
                }}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherAnalyticsScreen; 