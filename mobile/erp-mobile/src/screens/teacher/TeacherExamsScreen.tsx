import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  Award, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Target,
  BookOpen,
  GraduationCap
} from 'lucide-react-native';

interface ExamGroup {
  id: string;
  name: string;
  exam_type: string;
  grade: number;
  section: string;
  start_date: string;
  end_date: string;
  school_id: string;
}

interface ExamPaper {
  id: string;
  exam_group_id: string;
  subject: string;
  exam_date: string;
  exam_time?: string;
  duration_minutes: number;
  max_marks: number;
  school_id: string;
  exam_groups: ExamGroup;
}

interface ExamStats {
  totalExams: number;
  upcomingExams: number;
  completedExams: number;
  pendingMarks: number;
}

export const TeacherExamsScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  // Fetch exam papers for the teacher
  const { data: examPapers = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-exam-papers', user?.id],
    queryFn: async (): Promise<ExamPaper[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          exam_groups!inner(
            id,
            name,
            exam_type,
            grade,
            section,
            start_date,
            end_date,
            school_id
          )
        `)
        .eq('school_id', user.school_id)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch marks completion status
  const { data: marksStatus = [], refetch: refetchMarks } = useQuery({
    queryKey: ['teacher-marks-status', user?.id],
    queryFn: async () => {
      if (!user?.id || examPapers.length === 0) return [];

      const examPaperIds = examPapers.map(ep => ep.id);
      
      const { data, error } = await supabase
        .from('marks')
        .select('exam_paper_id, student_id')
        .in('exam_paper_id', examPaperIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && examPapers.length > 0,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchMarks()]);
    setRefreshing(false);
  };

  // Calculate statistics
  const getExamStats = (): ExamStats => {
    const now = new Date();
    const totalExams = examPapers.length;
    
    const upcomingExams = examPapers.filter(exam => 
      new Date(exam.exam_date) > now
    ).length;
    
    const completedExams = examPapers.filter(exam => 
      new Date(exam.exam_date) <= now
    ).length;
    
    const completedExamPapers = examPapers.filter(exam => 
      new Date(exam.exam_date) <= now
    );
    
    const pendingMarks = completedExamPapers.filter(exam => {
      const examMarks = marksStatus.filter(mark => mark.exam_paper_id === exam.id);
      return examMarks.length === 0; // No marks entered yet
    }).length;

    return {
      totalExams,
      upcomingExams,
      completedExams,
      pendingMarks
    };
  };

  // Filter exams based on selected filter
  const getFilteredExams = () => {
    const now = new Date();
    
    switch (selectedFilter) {
      case 'upcoming':
        return examPapers.filter(exam => new Date(exam.exam_date) > now);
      case 'completed':
        return examPapers.filter(exam => new Date(exam.exam_date) <= now);
      default:
        return examPapers;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExamUpcoming = (examDate: string) => {
    return new Date(examDate) > new Date();
  };

  const getExamStatus = (exam: ExamPaper) => {
    const isUpcoming = isExamUpcoming(exam.exam_date);
    const examMarks = marksStatus.filter(mark => mark.exam_paper_id === exam.id);
    
    if (isUpcoming) {
      return { status: 'upcoming', color: '#3b82f6', label: 'Upcoming' };
    } else if (examMarks.length > 0) {
      return { status: 'completed', color: '#10b981', label: 'Marks Entered' };
    } else {
      return { status: 'pending', color: '#f59e0b', label: 'Pending Marks' };
    }
  };

  const stats = getExamStats();
  const filteredExams = getFilteredExams();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading exams...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#06b6d4',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <Award size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Exam Management
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              View and manage exam schedules
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', marginHorizontal: -6 }}>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#06b6d4' }}>
                {stats.totalExams}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Total Exams
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.upcomingExams}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Upcoming
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>
                {stats.completedExams}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Completed
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b' }}>
                {stats.pendingMarks}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Pending
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
          {[
            { key: 'all', label: 'All Exams' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: selectedFilter === filter.key ? '#06b6d4' : '#f3f4f6',
                alignItems: 'center'
              }}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: selectedFilter === filter.key ? 'white' : '#6b7280'
              }}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ padding: 24 }}>
          {filteredExams.length > 0 ? (
            <View style={{ gap: 16 }}>
              {filteredExams.map((exam) => {
                const examStatus = getExamStatus(exam);
                
                return (
                  <Card key={exam.id}>
                    <CardContent style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                            {exam.subject}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <GraduationCap size={14} color="#6b7280" />
                            <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                              {exam.exam_groups.name} • Grade {exam.exam_groups.grade} {exam.exam_groups.section}
                            </Text>
                          </View>
                        </View>
                        <View style={{ 
                          backgroundColor: examStatus.color + '20', 
                          paddingHorizontal: 8, 
                          paddingVertical: 4, 
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          {examStatus.status === 'upcoming' && <Clock size={12} color={examStatus.color} />}
                          {examStatus.status === 'completed' && <CheckCircle size={12} color={examStatus.color} />}
                          {examStatus.status === 'pending' && <AlertCircle size={12} color={examStatus.color} />}
                          <Text style={{ 
                            fontSize: 12, 
                            color: examStatus.color, 
                            fontWeight: '500',
                            marginLeft: 4
                          }}>
                            {examStatus.label}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Calendar size={14} color="#6b7280" />
                          <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                            {formatDate(exam.exam_date)}
                            {exam.exam_time && ` at ${formatTime(exam.exam_time)}`}
                          </Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Clock size={14} color="#6b7280" />
                          <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                            Duration: {exam.duration_minutes} minutes
                          </Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Target size={14} color="#6b7280" />
                          <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                            Maximum Marks: {exam.max_marks}
                          </Text>
                        </View>
                      </View>
                      
                      {examStatus.status === 'pending' && (
                        <View style={{ 
                          marginTop: 12, 
                          padding: 12, 
                          backgroundColor: '#fef3c7', 
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <AlertCircle size={16} color="#f59e0b" />
                          <Text style={{ fontSize: 12, color: '#92400e', marginLeft: 8, flex: 1 }}>
                            Marks entry is pending for this exam. Please enter marks to complete the evaluation.
                          </Text>
                        </View>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <Award size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  {selectedFilter === 'all' ? 'No Exams Found' : 
                   selectedFilter === 'upcoming' ? 'No Upcoming Exams' : 
                   'No Completed Exams'}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  {selectedFilter === 'all' ? 
                    'No exam papers have been scheduled yet.' :
                    selectedFilter === 'upcoming' ? 
                    'All your exams have been completed. Check the completed section for past exams.' :
                    'No exams have been completed yet. Upcoming exams will appear here after completion.'
                  }
                </Text>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Exam Groups Summary */}
        {examPapers.length > 0 && (
          <View style={{ padding: 24, paddingTop: 0 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Exam Groups Overview
            </Text>
            
            {/* Group exams by exam group */}
            {Object.values(
              examPapers
                .reduce((groups, exam) => {
                  const groupId = exam.exam_group_id;
                  if (!groups[groupId]) {
                    groups[groupId] = {
                      group: exam.exam_groups,
                      papers: []
                    };
                  }
                  groups[groupId].papers.push(exam);
                  return groups;
                }, {} as Record<string, { group: ExamGroup; papers: ExamPaper[] }>)
            ).map(({ group, papers }) => (
              <Card key={group.id} style={{ marginBottom: 16 }}>
                <CardHeader>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                        {group.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>
                        Grade {group.grade}{group.section} • {papers.length} papers
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        {formatDate(group.start_date)} - {formatDate(group.end_date)}
                      </Text>
                    </View>
                  </View>
                </CardHeader>
                <CardContent>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {papers.map((paper) => {
                      const status = getExamStatus(paper);
                      return (
                        <View 
                          key={paper.id}
                          style={{ 
                            backgroundColor: status.color + '20',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4
                          }}
                        >
                          <Text style={{ 
                            fontSize: 12, 
                            color: status.color,
                            fontWeight: '500'
                          }}>
                            {paper.subject}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
