import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  ChevronDown,
  GraduationCap,
  Target,
  Activity,
  Filter,
  Download,
  Send,
  Eye,
  Plus,
  X,
  Search,
  Edit3
} from 'lucide-react-native';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  section_id: string;
  sections?: {
    id: string;
    grade: number;
    section: string;
  };
}

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  assigned_date: string;
  due_date: string;
  section_id: string;
  teacher_id: string;
  is_published: boolean;
  created_at: string;
  sections?: {
    grade: number;
    section: string;
  };
  homework_submissions?: {
    id: string;
    submitted_at: string;
    submission_text?: string;
    submission_type: 'text' | 'offline';
    status: 'submitted' | 'pending_review' | 'reviewed';
    file_url?: string;
  }[];
}

export const ParentHomeworkScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'due_soon'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionType, setSubmissionType] = useState<'text' | 'offline'>('text');

  // Fetch children using correct student_parents relationship
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
        section_id: item.students.section_id,
        sections: item.students.sections
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Set default selected child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children.length, selectedChild]); // Use children.length instead of children array

  // Fetch homework for selected child
  const { data: homework = [], isLoading: homeworkLoading, refetch: refetchHomework } = useQuery({
    queryKey: ['child-homework', selectedChild],
    queryFn: async (): Promise<Homework[]> => {
      if (!selectedChild) return [];

      const currentChild = children.find(c => c.id === selectedChild);
      if (!currentChild) return [];

      const { data, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          subject,
          assigned_date,
          due_date,
          section_id,
          teacher_id,
          is_published,
          created_at,
          sections!inner(grade, section)
        `)
        .eq('section_id', currentChild.section_id)
        .eq('school_id', user?.school_id)
        .eq('is_published', true)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('Error fetching homework:', error);
        return [];
      }

      // Fetch submissions for each homework
      const homeworkWithSubmissions = await Promise.all(
        (data || []).map(async (homeworkItem) => {
          const { data: submissions, error: submissionError } = await supabase
            .from('homework_submissions')
            .select('*')
            .eq('homework_id', homeworkItem.id)
            .eq('student_id', selectedChild);

          return {
            ...homeworkItem,
            sections: homeworkItem.sections?.[0], // Take first section since it's inner join
            homework_submissions: submissions || []
          };
        })
      );

      return homeworkWithSubmissions;
    },
    enabled: !!selectedChild && children.length > 0,
    staleTime: 1000 * 60 * 3, // Consider homework fresh for 3 minutes
  });

  const currentChild = children.find(child => child.id === selectedChild);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchChildren(),
      refetchHomework()
    ]);
    setRefreshing(false);
  };

  const getHomeworkStatus = (homework: Homework) => {
    const hasSubmission = homework.homework_submissions && homework.homework_submissions.length > 0;
    const dueDate = new Date(homework.due_date);
    const now = new Date();
    
    if (hasSubmission) return 'completed';
    if (dueDate < now) return 'overdue';
    if (dueDate.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000) return 'due_soon';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'overdue': return '#ef4444';
      case 'due_soon': return '#f59e0b';
      case 'pending': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'overdue': return AlertCircle;
      case 'due_soon': return Clock;
      case 'pending': return BookOpen;
      default: return FileText;
    }
  };

  const filteredHomework = homework.filter(hw => {
    const status = getHomeworkStatus(hw);
    if (filter === 'all') return true;
    if (filter === 'due_soon') return status === 'due_soon';
    return status === filter;
  });

  const getFilterCount = (filterType: string) => {
    return homework.filter(hw => {
      const status = getHomeworkStatus(hw);
      if (filterType === 'all') return true;
      if (filterType === 'due_soon') return status === 'due_soon';
      return status === filterType;
    }).length;
  };

  const filters = [
    { key: 'all', label: 'All', count: homework.length },
    { key: 'pending', label: 'Pending', count: getFilterCount('pending') },
    { key: 'completed', label: 'Completed', count: getFilterCount('completed') },
    { key: 'overdue', label: 'Overdue', count: getFilterCount('overdue') }
  ];

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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#10b981',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <BookOpen size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Homework Tracker
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Monitor assignments and submissions
            </Text>
          </View>
        </View>

        {/* Child Selector */}
        {children.length > 1 && (
          <View>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 8 }}>
              Select Child
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db'
              }}
              onPress={() => console.log('Open child selector')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GraduationCap size={16} color="#6b7280" />
                <Text style={{ fontSize: 14, color: '#111827', marginLeft: 8 }}>
                  {currentChild ? currentChild.full_name : 'Select child'}
                </Text>
              </View>
              <ChevronDown size={16} color="#6b7280" />
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
        {/* Current Child Info */}
        {currentChild && (
          <View style={{ marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 50, 
                    height: 50, 
                    borderRadius: 25,
                    backgroundColor: '#10b981',
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
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Filter size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Filter Homework
            </Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {filters.map((filterItem) => (
                <TouchableOpacity
                  key={filterItem.key}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: filter === filterItem.key ? '#3b82f6' : '#f3f4f6',
                    borderWidth: 1,
                    borderColor: filter === filterItem.key ? '#3b82f6' : '#d1d5db'
                  }}
                  onPress={() => setFilter(filterItem.key as any)}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: filter === filterItem.key ? 'white' : '#6b7280'
                  }}>
                    {filterItem.label} ({filterItem.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Homework List */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Activity size={20} color="#111827" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginLeft: 8 }}>
              Homework Assignments
            </Text>
          </View>
          
          {homeworkLoading ? (
            <Card>
              <CardContent style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280' }}>Loading homework...</Text>
              </CardContent>
            </Card>
          ) : filteredHomework.length > 0 ? (
            <View>
              {filteredHomework.map((hw) => {
                const status = getHomeworkStatus(hw);
                const StatusIcon = getStatusIcon(status);
                const statusColor = getStatusColor(status);
                
                return (
                  <Card key={hw.id} style={{ marginBottom: 16 }}>
                    <CardContent style={{ padding: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 20,
                          backgroundColor: statusColor + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <StatusIcon size={20} color={statusColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                            {hw.title}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                            {hw.subject}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                            {hw.description}
                          </Text>
                        </View>
                        <View style={{ 
                          backgroundColor: statusColor,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12
                        }}>
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' }}>
                            {status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Calendar size={16} color="#6b7280" />
                          <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                            Assigned: {new Date(hw.assigned_date).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Clock size={16} color="#6b7280" />
                          <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                            Due: {new Date(hw.due_date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      

                      
                      {hw.homework_submissions && hw.homework_submissions.length > 0 && (
                        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#15803d', marginBottom: 4 }}>
                            Submitted
                          </Text>
                          <Text style={{ fontSize: 12, color: '#166534' }}>
                            Submitted on: {new Date(hw.homework_submissions[0].submitted_at).toLocaleDateString()}
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
                <BookOpen size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                  No Homework Found
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                  No homework assignments found for the selected filter.
                </Text>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
