import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ParentQuickActions } from '../../components/dashboard/ParentQuickActions';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Award,
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Bell,
  Download,
  Eye,
  Target,
  Zap,
  Heart
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  gender?: string;
  section_id: string;
  sections?: {
    id: string;
    grade: number;
    section: string;
  };
}

interface ParentStats {
  childrenCount: number;
  upcomingHomework: number;
  attendancePercentage: number;
  lastActivity: string;
  totalExams: number;
  averageGrade: string;
}

// Simple Progress Circle Component
const ProgressCircle: React.FC<{ percentage: number; size: number; color: string }> = ({ 
  percentage, 
  size, 
  color 
}) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ 
          fontSize: size * 0.25, 
          fontWeight: 'bold', 
          color: color 
        }}>
          {percentage}%
        </Text>
      </View>
      <View style={{
        position: 'absolute',
        top: 2,
        left: 2,
        width: size - 4,
        height: size - 4,
        borderRadius: (size - 4) / 2,
        borderWidth: 3,
        borderColor: color + '30',
        borderTopColor: color,
        transform: [{ rotate: `${(percentage / 100) * 360}deg` }]
      }} />
    </View>
  );
};

export const ParentDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch children using the correct student_parents table relationship
  const { data: children = [], isLoading: childrenLoading, refetch: refetchChildren } = useQuery({
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
            gender,
            section_id,
            sections!inner(
              id,
              grade,
              section
            )
          )
        `)
        .eq('parent_id', user.id)
        .eq('students.school_id', user.school_id);

      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        gender: item.students.gender,
        section_id: item.students.section_id,
        sections: item.students.sections
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Set default selected child when children load
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children.length, selectedChild]); // Use children.length instead of children array

  // Fetch parent dashboard stats with enhanced data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['parent-stats', user?.id, selectedChild],
    queryFn: async (): Promise<ParentStats> => {
      if (!user?.id) return {
        childrenCount: 0,
        upcomingHomework: 0,
        attendancePercentage: 0,
        lastActivity: 'Never',
        totalExams: 0,
        averageGrade: 'N/A'
      };

      const childrenCount = children.length;
      const studentIds = selectedChild ? [selectedChild] : children.map(c => c.id);
      
      let upcomingHomework = 0;
      let attendancePercentage = 0;
      let totalExams = 0;
      let averageGrade = 'N/A';

      if (studentIds.length > 0) {
        // Get upcoming homework count
        const { data: homeworkData } = await supabase
          .from('homework')
          .select('id')
          .in('section_id', children.map(c => c.section_id))
          .gte('due_date', new Date().toISOString().split('T')[0])
          .eq('school_id', user.school_id);

        upcomingHomework = homeworkData?.length || 0;

        // Calculate attendance percentage for current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('status')
          .in('student_id', studentIds)
          .gte('date', currentMonth + '-01')
          .lt('date', currentMonth + '-32')
          .eq('school_id', user.school_id);

        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.status === 'present').length;
          attendancePercentage = Math.round((presentCount / attendanceData.length) * 100);
        }

        // Get exam data
        const { data: examData } = await supabase
          .from('marks')
          .select('marks_obtained, max_marks')
          .in('student_id', studentIds)
          .eq('school_id', user.school_id);

        if (examData && examData.length > 0) {
          totalExams = examData.length;
          const totalMarks = examData.reduce((sum, exam) => sum + exam.marks_obtained, 0);
          const totalMaxMarks = examData.reduce((sum, exam) => sum + exam.max_marks, 0);
          if (totalMaxMarks > 0) {
            averageGrade = `${Math.round((totalMarks / totalMaxMarks) * 100)}%`;
          }
        }
      }

      return {
        childrenCount,
        upcomingHomework,
        attendancePercentage,
        lastActivity: 'Today',
        totalExams,
        averageGrade
      };
    },
    enabled: !!user?.id && children.length > 0,
    staleTime: 1000 * 60 * 2, // Consider stats fresh for 2 minutes
  });

  const currentChild = children.find(child => child.id === selectedChild);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchChildren();
    setRefreshing(false);
  };

  const quickActions = [
    {
      title: 'Attendance',
      description: 'Daily attendance records',
      icon: Calendar,
      color: '#3b82f6',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Attendance' })
    },
    {
      title: 'Homework',
      description: 'Assignments & submissions',
      icon: BookOpen,
      color: '#10b981',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: 'Exam Results',
      description: 'Scores & performance',
      icon: Award,
      color: '#8b5cf6',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
    },
    {
      title: 'Timetable',
      description: 'Class schedule',
      icon: Clock,
      color: '#f59e0b',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: 'Announcements',
      description: 'School updates',
      icon: Bell,
      color: '#ef4444',
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Announcements' })
    },
    {
      title: 'Reports',
      description: 'Download report cards',
      icon: Download,
      color: '#06b6d4',
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Reports' })
    },
  ];

  const statsData = stats || {
    childrenCount: children.length,
    upcomingHomework: 0,
    attendancePercentage: 0,
    lastActivity: 'Today',
    totalExams: 0,
    averageGrade: 'N/A'
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Enhanced Header */}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20, 
                backgroundColor: '#10b981',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Heart size={20} color="white" />
              </View>
              <View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  {user?.first_name} {user?.last_name}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 16, color: '#374151', fontWeight: '500' }}>
              {children.length === 0 ? 'No children linked' : 
               children.length === 1 ? `Monitoring ${children[0].full_name}'s progress` :
               `Tracking ${children.length} children's academic journey`}
            </Text>
          </View>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="outline"
            size="sm"
          />
        </View>

        {/* Child Selector */}
        {children.length > 1 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
              Select Child
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#d1d5db'
              }}
              onPress={() => console.log('Open child selector')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GraduationCap size={20} color="#6b7280" />
                <Text style={{ fontSize: 16, color: '#111827', marginLeft: 8 }}>
                  {currentChild ? `${currentChild.full_name} - Grade ${currentChild.sections?.grade}` : 'Select a child'}
                </Text>
              </View>
              <ChevronDown size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Enhanced Stats Grid with Graphics */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <BarChart3 size={20} color="#111827" />
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Performance Overview
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            {/* Attendance with Progress Circle */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20, alignItems: 'center' }}>
                  <ProgressCircle 
                    percentage={statsData.attendancePercentage} 
                    size={60} 
                    color="#10b981" 
                  />
                  <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                    Attendance
                  </Text>
                  <Text style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                    This month
                  </Text>
                </CardContent>
              </Card>
            </View>

            {/* Children Count */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {statsData.childrenCount}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Children
                      </Text>
                      <Text style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                        Enrolled
                      </Text>
                    </View>
                    <Users size={24} color="#3b82f6" />
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Homework with Visual Indicator */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {statsData.upcomingHomework}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Homework
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: 4, 
                          backgroundColor: statsData.upcomingHomework > 0 ? '#f59e0b' : '#10b981',
                          marginRight: 4 
                        }} />
                        <Text style={{ fontSize: 12, color: statsData.upcomingHomework > 0 ? '#f59e0b' : '#10b981' }}>
                          {statsData.upcomingHomework > 0 ? 'Due soon' : 'Up to date'}
                        </Text>
                      </View>
                    </View>
                    <BookOpen size={24} color="#f59e0b" />
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Average Grade */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {statsData.averageGrade}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Avg Grade
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Star size={12} color="#f59e0b" />
                        <Text style={{ fontSize: 12, color: '#f59e0b', marginLeft: 4 }}>
                          {statsData.totalExams} exams
                        </Text>
                      </View>
                    </View>
                    <Target size={24} color="#8b5cf6" />
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <ParentQuickActions />

        {/* Current Child Info Enhanced */}
        {currentChild && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Activity size={20} color="#111827" />
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
                {children.length > 1 ? 'Selected Child' : 'Child Profile'}
              </Text>
            </View>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ 
                    width: 50, 
                    height: 50, 
                    borderRadius: 25,
                    backgroundColor: '#3b82f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                      {currentChild.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                      {currentChild.full_name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                      Grade {currentChild.sections?.grade} - Section {currentChild.sections?.section}
                    </Text>
                  </View>
                  <View style={{ 
                    backgroundColor: '#10b981',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                      Active
                    </Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      Admission No.
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      {currentChild.admission_no || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      Gender
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      {currentChild.gender || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      Status
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: 4, 
                        backgroundColor: '#10b981',
                        marginRight: 4 
                      }} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#10b981' }}>
                        Active
                      </Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Enhanced Quick Actions */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Zap size={20} color="#111827" />
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Quick Actions
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            {quickActions.map((action, index) => (
              <View key={index} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                <TouchableOpacity onPress={action.onPress}>
                  <Card>
                    <CardContent style={{ padding: 20, alignItems: 'center' }}>
                      <View style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 28, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginBottom: 12,
                        backgroundColor: action.color + '20'
                      }}>
                        <action.icon size={28} color={action.color} />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: 4 }}>
                        {action.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                        {action.description}
                      </Text>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* No Children State */}
        {!childrenLoading && children.length === 0 && (
          <Card>
            <CardContent style={{ padding: 32, alignItems: 'center' }}>
              <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                No Children Found
              </Text>
              <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 20 }}>
                No children are currently linked to your account. Please contact the school administration to link your children's records.
              </Text>
              <Button
                title="Contact Support"
                onPress={() => console.log('Contact support')}
                style={{ backgroundColor: '#3b82f6' }}
              />
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
