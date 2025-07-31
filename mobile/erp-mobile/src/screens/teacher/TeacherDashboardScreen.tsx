import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBar } from 'expo-status-bar';
import { TeacherQuickActions } from '../../components/dashboard/TeacherQuickActions';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Award, 
  CheckCircle, 
  Clock, 
  GraduationCap,
  PenTool,
  MessageSquare,
  ClipboardList,
  Eye,
  TrendingUp,
  FileText,
  UserCheck,
  Activity,
  Target,
  Zap,
  BarChart3
} from 'lucide-react-native';

interface TeacherStats {
  totalStudents: number;
  assignedSections: number;
  classTeacherSections: number;
  completedExams: number;
  pendingReports: number;
  upcomingHomework: number;
}

interface Section {
  id: string;
  grade: number;
  section: string;
  school_id: string;
  class_teacher?: string;
}

interface ExamPaper {
  id: string;
  subject: string;
  exam_date: string;
  exam_time: string;
  duration_minutes: number;
  max_marks: number;
}

export const TeacherDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch teacher's assigned sections
  const { data: teacherSections = [], isLoading: sectionsLoading, refetch: refetchSections } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id,
            class_teacher
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        school_id: item.sections.school_id,
        class_teacher: item.sections.class_teacher
      }));
    },
    enabled: !!user?.id,
  });

  // Get total students count across all sections
  const { data: totalStudents = 0, isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher-total-students', user?.id, teacherSections],
    queryFn: async (): Promise<number> => {
      if (!user?.id || teacherSections.length === 0) return 0;
      
      const sectionIds = teacherSections.map(s => s.id);
      const { data, error } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .in('section_id', sectionIds);
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id && teacherSections.length > 0,
  });

  // Get class teacher sections (sections where this teacher is the class teacher)
  const { data: classTeacherSections = [], isLoading: classTeacherLoading } = useQuery({
    queryKey: ['class-teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('sections')
        .select('id, grade, section, school_id, class_teacher')
        .eq('class_teacher', user.id)
        .eq('school_id', user.school_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get exam groups and papers
  const { data: examPapers = [], isLoading: examsLoading } = useQuery({
    queryKey: ['teacher-exam-papers', user?.id],
    queryFn: async (): Promise<ExamPaper[]> => {
      if (!user?.id) {
        console.log('❌ Dashboard: No user ID for exam papers query');
        return [];
      }

      console.log('🔍 Dashboard: Fetching exam papers for teacher:', user.id);

      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          id,
          subject,
          exam_date,
          exam_time,
          duration_minutes,
          max_marks,
          teachers!inner(
            user_id
          )
        `)
        .eq('school_id', user.school_id)
        .eq('teachers.user_id', user.id)
        .order('exam_date', { ascending: true });

      console.log('📊 Dashboard: Exam papers query result:', { data, error });

      if (error) {
        console.error('❌ Dashboard: Exam papers query error:', error);
        throw error;
      }
      
      console.log('✅ Dashboard: Fetched exam papers:', data?.length || 0, 'papers');
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate statistics
  const completedExams = examPapers.filter(paper => 
    paper.exam_date && new Date(paper.exam_date) <= new Date()
  ).length;

  const pendingMarksPapers = examPapers.filter(paper => {
    const isPastExam = paper.exam_date && new Date(paper.exam_date) <= new Date();
    return isPastExam;
  }).slice(0, 5);

  console.log('📊 Dashboard: Pending marks calculation:', {
    totalExamPapers: examPapers.length,
    completedExams,
    pendingMarksPapers: pendingMarksPapers.length,
    pendingPapers: pendingMarksPapers.map(p => ({ id: p.id, subject: p.subject, date: p.exam_date }))
  });

  const stats: TeacherStats = {
    totalStudents,
    assignedSections: teacherSections.length,
    classTeacherSections: classTeacherSections.length,
    completedExams,
    pendingReports: 0, // Will be calculated from reports data
    upcomingHomework: 0, // Will be calculated from homework data
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSections(),
    ]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Progress Circle Component
  const ProgressCircle = ({ percentage, size = 60, color = '#3b82f6' }: { percentage: number; size?: number; color?: string }) => {
    const radius = size / 2 - 6;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          backgroundColor: color + '20',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Text style={{ fontSize: size / 4, fontWeight: 'bold', color }}>
            {percentage}%
          </Text>
        </View>
      </View>
    );
  };

  const quickActions = [
    {
      title: "Enter Marks",
      description: "Update exam marks for your subjects",
      icon: PenTool,
      color: "#3b82f6",
      badge: pendingMarksPapers.length > 0 ? pendingMarksPapers.length : null,
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Marks' })
    },
    {
      title: "Take Attendance",
      description: "Mark student attendance",
      icon: Users,
      color: "#10b981",
      onPress: () => (navigation as any).navigate('AttendanceTab', { screen: 'Attendance' })
    },
    {
      title: "View Timetable",
      description: "Check your class schedule",
      icon: Calendar,
      color: "#f59e0b",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })
    },
    {
      title: "Create Homework",
      description: "Assign new homework to students",
      icon: ClipboardList,
      color: "#8b5cf6",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Homework' })
    },
    {
      title: "Announcements",
      description: "Share updates with students",
      icon: MessageSquare,
      color: "#ef4444",
      onPress: () => (navigation as any).navigate('MessagesTab', { screen: 'Announcements' })
    },
    {
      title: "Exam Management",
      description: "Manage exams and papers",
      icon: Award,
      color: "#06b6d4",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'Exams' })
    },
    {
      title: "Co-Scholastic",
      description: "CBSE assessments & values",
      icon: Target,
      color: "#7c3aed",
      onPress: () => (navigation as any).navigate('AcademicsTab', { screen: 'CoScholastic' })
    },
  ];

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
        borderBottomColor: '#e5e7eb' 
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20,
                backgroundColor: '#3b82f6',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  {user?.first_name?.charAt(0) || 'T'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                  {getGreeting()}, {user?.first_name}!
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  Ready to inspire minds today?
                </Text>
              </View>
            </View>
          </View>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="outline"
            size="sm"
          />
        </View>
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
              Teaching Analytics
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            {/* Students with Progress Circle */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20, alignItems: 'center' }}>
                  <ProgressCircle 
                    percentage={Math.min(100, Math.round((stats.totalStudents / 50) * 100))} 
                    size={60} 
                    color="#3b82f6" 
                  />
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 8 }}>
                    {stats.totalStudents}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2, textAlign: 'center' }}>
                    Students
                  </Text>
                  <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>
                    Teaching Load
                  </Text>
                </CardContent>
              </Card>
            </View>

            {/* Sections with Visual Indicator */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {stats.assignedSections}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Sections
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: 4, 
                          backgroundColor: '#10b981',
                          marginRight: 4 
                        }} />
                        <Text style={{ fontSize: 12, color: '#10b981' }}>
                          {stats.classTeacherSections} Class Teacher
                        </Text>
                      </View>
                    </View>
                    <GraduationCap size={24} color="#10b981" />
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Exams with Progress Indicator */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {stats.completedExams}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Exams
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <CheckCircle size={12} color="#8b5cf6" />
                        <Text style={{ fontSize: 12, color: '#8b5cf6', marginLeft: 4 }}>
                          Completed
                        </Text>
                      </View>
                    </View>
                    <Award size={24} color="#8b5cf6" />
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Pending Reports with Alert */}
            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {stats.pendingReports}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Reports
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Clock size={12} color="#f59e0b" />
                        <Text style={{ fontSize: 12, color: '#f59e0b', marginLeft: 4 }}>
                          Pending
                        </Text>
                      </View>
                    </View>
                    <FileText size={24} color="#f59e0b" />
                  </View>
                </CardContent>
              </Card>
            </View>

            <View style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
              <Card>
                <CardContent style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>
                        {stats.classTeacherSections}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        Class Teacher
                      </Text>
                      <Text style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                        Sections
                      </Text>
                    </View>
                    <UserCheck size={24} color="#f59e0b" />
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <TeacherQuickActions />

        {/* Assigned Sections */}
        {teacherSections.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              My Assigned Sections
            </Text>
            <Card>
              <CardHeader>
                <Text style={{ fontSize: 16, color: '#6b7280' }}>
                  Sections where you teach or serve as class teacher
                </Text>
              </CardHeader>
              <CardContent>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                  {teacherSections.map((section) => (
                    <View key={section.id} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                      <View style={{
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        backgroundColor: '#f9fafb'
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            Grade {section.grade}{section.section}
                          </Text>
                          {section.class_teacher === user?.id && (
                            <View style={{ 
                              backgroundColor: '#dbeafe', 
                              paddingHorizontal: 8, 
                              paddingVertical: 2, 
                              borderRadius: 12 
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: '500', color: '#1d4ed8' }}>
                                Class Teacher
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                          {section.class_teacher === user?.id 
                            ? 'You are the class teacher'
                            : 'Subject teacher'
                          }
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#3b82f6',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 6,
                              flex: 1
                            }}
                            onPress={() => (navigation as any).navigate('AttendanceTab', { screen: 'Attendance' })}
                          >
                            <Text style={{ fontSize: 12, color: 'white', textAlign: 'center', fontWeight: '500' }}>
                              Attendance
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#10b981',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 6,
                              flex: 1
                            }}
                            onPress={() => (navigation as any).navigate('AcademicsTab', { screen: 'Timetable' })}
                          >
                            <Text style={{ fontSize: 12, color: 'white', textAlign: 'center', fontWeight: '500' }}>
                              Timetable
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
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
                      {action.badge && (
                        <View style={{ 
                          backgroundColor: '#ef4444', 
                          paddingHorizontal: 8, 
                          paddingVertical: 2, 
                          borderRadius: 10, 
                          marginTop: 8 
                        }}>
                          <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                            {action.badge}
                          </Text>
                        </View>
                      )}
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Pending Marks Entry */}
        {pendingMarksPapers.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Pending Marks Entry
            </Text>
            <Card>
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={20} color="#f59e0b" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
                    Exams Requiring Marks Entry
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  Complete marks entry for these recently conducted exams
                </Text>
              </CardHeader>
              <CardContent>
                <View style={{ gap: 12 }}>
                  {pendingMarksPapers.map((paper, index) => (
                    <View
                      key={paper.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        backgroundColor: '#fef3c7',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#fbbf24'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: 16, 
                          backgroundColor: '#f59e0b20', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <PenTool size={16} color="#f59e0b" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            {paper.subject}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Max Marks: {paper.max_marks} • {paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : 'TBD'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#f59e0b',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8
                        }}
                        onPress={() => {
                          console.log('🔍 Dashboard: Navigate to Enter Marks for exam:', paper.id);
                          (navigation as any).navigate('AcademicsTab', { 
                            screen: 'Marks',
                            params: { 
                              examId: paper.id, 
                              examDetails: {
                                id: paper.id,
                                exam_name: `${paper.subject} Exam`,
                                subject: paper.subject,
                                date: paper.exam_date,
                                max_marks: paper.max_marks,
                                grade: 0, // Will be filled by the marks screen
                                section: '', // Will be filled by the marks screen
                                start_time: paper.exam_time || '',
                                venue: 'TBA'
                              }
                            }
                          });
                        }}
                      >
                        <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>
                          Enter Marks
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}; 