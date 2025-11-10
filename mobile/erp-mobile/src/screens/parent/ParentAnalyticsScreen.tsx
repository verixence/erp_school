import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  User,
  AlertTriangle,
  CheckCircle,
  Star,
  Brain
} from 'lucide-react-native';

interface Child {
  id: string;
  full_name: string;
  grade: number;
  section: string;
  school_id: string;
}

interface ChildAnalytics {
  childId: string;
  childName: string;
  grade: number;
  section: string;
  attendancePercentage: number;
  attendanceTrend: 'up' | 'down' | 'stable';
  averageGrade: number;
  gradeTrend: 'up' | 'down' | 'stable';
  subjectPerformance: Array<{
    subject: string;
    average: number;
    trend: 'up' | 'down' | 'stable';
    rank: number;
    totalStudents: number;
  }>;
  recentAttendance: Array<{
    date: string;
    status: 'present' | 'absent' | 'late';
  }>;
  upcomingAssignments: number;
  overdueAssignments: number;
}

interface OverallStats {
  totalChildren: number;
  averageAttendance: number;
  averageGrade: number;
  totalUpcomingAssignments: number;
  totalOverdueAssignments: number;
  bestPerformingSubject: string;
  needsAttentionSubjects: string[];
}

const TIME_PERIODS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' }
];

export const ParentAnalyticsScreen = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedAnalytic, setSelectedAnalytic] = useState<'overview' | 'attendance' | 'grades'>('overview');

  // Fetch parent's children
  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data: studentParents, error: spError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', user.id);

      if (spError || !studentParents?.length) return [];

      const studentIds = studentParents.map(sp => sp.student_id);
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade, section, school_id')
        .in('id', studentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['parent-analytics', user?.id, selectedPeriod, selectedChild],
    queryFn: async () => {
      if (!user?.id || children.length === 0) return null;

      // Mock analytics data
      const mockOverallStats: OverallStats = {
        totalChildren: children.length,
        averageAttendance: 93.5,
        averageGrade: 82.4,
        totalUpcomingAssignments: 8,
        totalOverdueAssignments: 2,
        bestPerformingSubject: 'Mathematics',
        needsAttentionSubjects: ['History', 'Science']
      };

      const mockChildAnalytics: ChildAnalytics[] = children.map((child, index) => ({
        childId: child.id,
        childName: child.full_name,
        grade: child.grade,
        section: child.section,
        attendancePercentage: 94.2 - (index * 2),
        attendanceTrend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'stable' : 'down',
        averageGrade: 85.5 - (index * 3),
        gradeTrend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'stable',
        subjectPerformance: [
          { subject: 'Mathematics', average: 88 - (index * 2), trend: 'up', rank: index + 3, totalStudents: 30 },
          { subject: 'Science', average: 82 - (index * 1), trend: 'stable', rank: index + 5, totalStudents: 30 },
          { subject: 'English', average: 79 - (index * 2), trend: 'down', rank: index + 8, totalStudents: 30 },
          { subject: 'History', average: 76 - (index * 1), trend: 'stable', rank: index + 10, totalStudents: 30 }
        ],
        recentAttendance: [
          { date: '2024-01-12', status: 'present' },
          { date: '2024-01-11', status: 'present' },
          { date: '2024-01-10', status: index % 2 === 0 ? 'present' : 'late' },
          { date: '2024-01-09', status: 'present' },
          { date: '2024-01-08', status: index % 3 === 0 ? 'absent' : 'present' }
        ],
        upcomingAssignments: 4 - index,
        overdueAssignments: index > 0 ? 1 : 0
      }));

      return {
        overallStats: mockOverallStats,
        childAnalytics: selectedChild === 'all' ? mockChildAnalytics : mockChildAnalytics.filter(c => c.childId === selectedChild)
      };
    },
    enabled: !!user?.id && children.length > 0,
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

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getSelectedPeriodLabel = () => {
    return TIME_PERIODS.find(p => p.value === selectedPeriod)?.label || 'This Month';
  };

  const getSelectedChildName = () => {
    if (selectedChild === 'all') return 'All Children';
    const child = children.find(c => c.id === selectedChild);
    return child?.full_name || 'Select Child';
  };

  const renderChildAnalytics = ({ item }: { item: ChildAnalytics }) => (
    <Card style={{ marginBottom: 16 }}>
      <CardContent style={{ padding: 16 }}>
        {/* Child Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            backgroundColor: '#3b82f6',
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <User size={20} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              {item.childName}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Grade {item.grade} - Section {item.section}
            </Text>
          </View>
        </View>

        {selectedAnalytic === 'overview' && (
          <>
            {/* Key Metrics */}
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <CheckCircle size={16} color="#10b981" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10b981', marginLeft: 4 }}>
                    {formatPercentage(item.attendancePercentage)}
                  </Text>
                  {getTrendIcon(item.attendanceTrend)}
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Attendance</Text>
              </View>
              
              <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Award size={16} color="#f59e0b" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#f59e0b', marginLeft: 4 }}>
                    {item.averageGrade.toFixed(1)}
                  </Text>
                  {getTrendIcon(item.gradeTrend)}
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Avg Grade</Text>
              </View>
            </View>

            {/* Assignments */}
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#dbeafe', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#3b82f6' }}>
                  {item.upcomingAssignments}
                </Text>
                <Text style={{ fontSize: 12, color: '#3b82f6' }}>Upcoming</Text>
              </View>
              
              <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>
                  {item.overdueAssignments}
                </Text>
                <Text style={{ fontSize: 12, color: '#ef4444' }}>Overdue</Text>
              </View>
            </View>

            {/* Subject Performance Summary */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              Top Subjects
            </Text>
            {item.subjectPerformance.slice(0, 3).map((subject, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: '#f3f4f6'
              }}>
                <Text style={{ fontSize: 14, color: '#111827' }}>{subject.subject}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>
                    Rank {subject.rank}/{subject.totalStudents}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                    {subject.average.toFixed(1)}
                  </Text>
                  {getTrendIcon(subject.trend)}
                </View>
              </View>
            ))}
          </>
        )}

        {selectedAnalytic === 'attendance' && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
              Recent Attendance
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              {item.recentAttendance.slice(0, 5).map((attendance, index) => (
                <View key={index} style={{ alignItems: 'center' }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: getAttendanceStatusColor(attendance.status),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4
                  }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                      {new Date(attendance.date).getDate()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>
                    {attendance.status}
                  </Text>
                </View>
              ))}
            </View>
            
            <View style={{ 
              backgroundColor: '#f9fafb', 
              padding: 12, 
              borderRadius: 8,
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}>
              <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>
                Monthly Average
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                {formatPercentage(item.attendancePercentage)}
              </Text>
            </View>
          </>
        )}

        {selectedAnalytic === 'grades' && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
              Subject Performance
            </Text>
            {item.subjectPerformance.map((subject, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
                    {subject.subject}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: getTrendColor(subject.trend) }}>
                      {subject.average.toFixed(1)}
                    </Text>
                    {getTrendIcon(subject.trend)}
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Class Rank: {subject.rank} of {subject.totalStudents}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Percentile: {((subject.totalStudents - subject.rank + 1) / subject.totalStudents * 100).toFixed(0)}%
                  </Text>
                </View>
                
                {/* Grade Progress Bar */}
                <View style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    width: `${subject.average}%`,
                    backgroundColor: subject.average >= 85 ? '#10b981' : subject.average >= 75 ? '#f59e0b' : '#ef4444'
                  }} />
                </View>
              </View>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const overallStats = analyticsData?.overallStats;
  const childAnalytics = analyticsData?.childAnalytics || [];

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
              backgroundColor: '#8b5cf6', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <BarChart3 size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                Child Analytics
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Track your children's academic progress
              </Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
          {children.length > 1 && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8
              }}
              onPress={() => setShowChildModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <User size={16} color="#6b7280" />
                <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
                  {getSelectedChildName()}
                </Text>
              </View>
              <ChevronDown size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={{
              flex: 1,
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
        {/* Overall Stats */}
        {overallStats && selectedChild === 'all' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Family Overview
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Users size={20} color="#8b5cf6" />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#8b5cf6', marginLeft: 8 }}>
                    {overallStats.totalChildren}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Children
                </Text>
              </Card>
              
              <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981', marginLeft: 8 }}>
                    {formatPercentage(overallStats.averageAttendance)}
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
                    {overallStats.averageGrade.toFixed(1)}
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
                    {overallStats.totalOverdueAssignments}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Overdue
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
                { key: 'overview', label: 'Overview', icon: Target },
                { key: 'attendance', label: 'Attendance', icon: Clock },
                { key: 'grades', label: 'Grades', icon: BookOpen }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedAnalytic === tab.key ? '#8b5cf6' : '#f3f4f6',
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

        {/* Child Analytics */}
        {childAnalytics.length === 0 ? (
          <Card>
            <CardContent style={{ padding: 32, alignItems: 'center' }}>
              <BarChart3 size={48} color="#6b7280" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                No Analytics Available
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                Analytics data will appear here once your children start attending classes.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <FlatList
            data={childAnalytics}
            renderItem={renderChildAnalytics}
            keyExtractor={(item) => item.childId}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Child Selector Modal */}
      {children.length > 1 && (
        <Modal
          visible={showChildModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowChildModal(false)}
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
                Select Child
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedChild === 'all' ? '#8b5cf6' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedChild('all');
                  setShowChildModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedChild === 'all' ? '#8b5cf6' : '#111827',
                  fontWeight: selectedChild === 'all' ? '600' : '400'
                }}>
                  All Children
                </Text>
              </TouchableOpacity>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedChild === child.id ? '#8b5cf6' + '20' : 'transparent'
                  }}
                  onPress={() => {
                    setSelectedChild(child.id);
                    setShowChildModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedChild === child.id ? '#8b5cf6' : '#111827',
                    fontWeight: selectedChild === child.id ? '600' : '400'
                  }}>
                    {child.full_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Grade {child.grade} - {child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      )}

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
                  backgroundColor: selectedPeriod === period.value ? '#8b5cf6' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedPeriod(period.value);
                  setShowPeriodModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedPeriod === period.value ? '#8b5cf6' : '#111827',
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

export default ParentAnalyticsScreen; 