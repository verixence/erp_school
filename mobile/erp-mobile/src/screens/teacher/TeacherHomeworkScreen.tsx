import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  FlatList,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
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
  Users,
  Plus,
  FileText,
  Edit3,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Target,
  Activity,
  GraduationCap,
  Send,
  Save,
  X,
  Search,
  Filter
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Section {
  id: string;
  grade: number;
  section: string;
  class_teacher?: string;
}

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  assigned_date: string;
  section_id: string;
  teacher_id: string;
  attachments?: string[];
  is_published: boolean;
  created_at: string;
  sections?: {
    grade: number;
    section: string;
  };
  submissions_count?: number;
  total_students?: number;
}

interface HomeworkFormData {
  title: string;
  description: string;
  subject: string;
  due_date: string;
  section_id: string;
  file_url?: string;
}

export const TeacherHomeworkScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const [formData, setFormData] = useState<HomeworkFormData>({
    title: '',
    description: '',
    subject: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    section_id: ''
  });

  // Fetch teacher's assigned sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
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
        class_teacher: item.sections.class_teacher
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch homework assignments
  const { data: homeworkList = [], isLoading: homeworkLoading, refetch: refetchHomework } = useQuery({
    queryKey: ['teacher-homework', user?.id, selectedSection, filterStatus],
    queryFn: async (): Promise<Homework[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('homework')
        .select(`
          *,
          sections!inner(grade, section)
        `)
        .eq('teacher_id', user.id)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (selectedSection !== 'all') {
        query = query.eq('section_id', selectedSection);
      }

      if (filterStatus !== 'all') {
        query = query.eq('is_published', filterStatus === 'published');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get submission counts for each homework
      const homeworkWithCounts = await Promise.all(
        (data || []).map(async (homework) => {
          const { data: submissions, error: submissionError } = await supabase
            .from('homework_submissions')
            .select('id', { count: 'exact' })
            .eq('homework_id', homework.id);

          const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('section_id', homework.section_id);

          return {
            ...homework,
            submissions_count: submissions?.length || 0,
            total_students: students?.length || 0
          };
        })
      );

      return homeworkWithCounts;
    },
    enabled: !!user?.id,
  });

  // Filter homework by search query
  const filteredHomework = React.useMemo(() => {
    if (!searchQuery) return homeworkList;
    return homeworkList.filter(homework => 
      homework.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      homework.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      homework.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [homeworkList, searchQuery]);

  // Create homework mutation
  const createHomeworkMutation = useMutation({
    mutationFn: async (data: HomeworkFormData & { is_published: boolean }) => {
             const payload = {
         title: data.title,
         description: data.description,
         subject: data.subject,
         section: data.section_id,
         due_date: data.due_date,
         school_id: user?.school_id,
         created_by: user?.id,
         file_url: data.file_url || null
       };

      const { error } = await supabase
        .from('homeworks')
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Homework assignment created successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create homework assignment');
    },
  });

  // Update homework mutation
  const updateHomeworkMutation = useMutation({
    mutationFn: async (data: { id: string } & Partial<HomeworkFormData> & { is_published?: boolean }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('homeworks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Homework assignment updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      setEditingHomework(null);
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update homework assignment');
    },
  });

  // Delete homework mutation
  const deleteHomeworkMutation = useMutation({
    mutationFn: async (homeworkId: string) => {
      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', homeworkId);

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Homework assignment deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete homework assignment');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      section_id: sections.length > 0 ? sections[0].id : ''
    });
  };

  const handleCreateHomework = (isDraft: boolean = false) => {
    if (!formData.title || !formData.description || !formData.subject || !formData.section_id) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (new Date(formData.due_date) <= new Date()) {
      Alert.alert('Validation Error', 'Due date must be in the future');
      return;
    }

    createHomeworkMutation.mutate({
      ...formData,
      is_published: !isDraft
    });
  };

  const handleUpdateHomework = (isDraft: boolean = false) => {
    if (!editingHomework || !formData.title || !formData.description || !formData.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    updateHomeworkMutation.mutate({
      id: editingHomework.id,
      ...formData,
      is_published: !isDraft
    });
  };

  const handleEditHomework = (homework: Homework) => {
    setEditingHomework(homework);
    setFormData({
      title: homework.title,
      description: homework.description,
      subject: homework.subject,
      due_date: homework.due_date,
      section_id: homework.section_id
      });
    setShowCreateModal(true);
  };

  const handleDeleteHomework = (homework: Homework) => {
    Alert.alert(
      'Delete Homework',
      `Are you sure you want to delete "${homework.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteHomeworkMutation.mutate(homework.id)
        },
      ]
    );
  };

  const handlePublishHomework = (homework: Homework) => {
    updateHomeworkMutation.mutate({
      id: homework.id,
      is_published: true
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchHomework();
    setRefreshing(false);
  };

  useEffect(() => {
    if (sections.length > 0 && !formData.section_id) {
      setFormData(prev => ({ ...prev, section_id: sections[0].id }));
    }
  }, [sections]);

  const renderHomeworkCard = ({ item: homework }: { item: Homework }) => {
    const isOverdue = new Date(homework.due_date) < new Date();
    const daysUntilDue = Math.ceil((new Date(homework.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const submissionRate = homework.total_students ? (homework.submissions_count! / homework.total_students) * 100 : 0;

    return (
      <Card style={{ marginBottom: 16 }}>
        <CardContent style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                {homework.title}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                {homework.subject} • Grade {homework.sections?.grade} {homework.sections?.section}
              </Text>
              <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                {homework.description.length > 100 
                  ? homework.description.substring(0, 100) + '...' 
                  : homework.description
                }
              </Text>
            </View>
            
            <View style={{ alignItems: 'flex-end' }}>
              {homework.is_published ? (
                <View style={{ 
                  backgroundColor: '#10b981',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginBottom: 8
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                    Published
                  </Text>
                </View>
              ) : (
                <View style={{ 
                  backgroundColor: '#f59e0b',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginBottom: 8
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                    Draft
                  </Text>
                </View>
              )}
              
              {isOverdue && homework.is_published && (
                <View style={{ 
                  backgroundColor: '#ef4444',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '500' }}>
                    Overdue
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Due Date and Stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={16} color="#6b7280" />
              <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                Due: {new Date(homework.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              {!isOverdue && daysUntilDue <= 3 && (
                <Text style={{ fontSize: 12, color: '#ef4444', marginLeft: 8, fontWeight: '500' }}>
                  ({daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} left)
                </Text>
              )}
            </View>
            
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              {homework.submissions_count}/{homework.total_students} submitted ({submissionRate.toFixed(0)}%)
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={{ backgroundColor: '#f3f4f6', height: 4, borderRadius: 2, marginBottom: 16 }}>
            <View style={{ 
              backgroundColor: submissionRate >= 80 ? '#10b981' : submissionRate >= 50 ? '#f59e0b' : '#ef4444',
              height: 4, 
              borderRadius: 2,
              width: `${submissionRate}%`
            }} />
          </View>
          
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleEditHomework(homework)}
              style={{
                flex: 1,
                backgroundColor: '#3b82f6',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit3 size={14} color="white" />
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 4 }}>
                Edit
              </Text>
            </TouchableOpacity>
            
            {!homework.is_published && (
              <TouchableOpacity
                onPress={() => handlePublishHomework(homework)}
                style={{
                  flex: 1,
                  backgroundColor: '#10b981',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={14} color="white" />
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 4 }}>
                  Publish
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={() => handleDeleteHomework(homework)}
              style={{
                backgroundColor: '#ef4444',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Trash2 size={14} color="white" />
            </TouchableOpacity>
        </View>
        </CardContent>
      </Card>
    );
  };

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
            Homework Management
              </Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#3b82f6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Plus size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '500', marginLeft: 4 }}>
              Create
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          Create and manage homework assignments for your students
              </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search and Filters */}
        <Card style={{ marginBottom: 24 }}>
          <CardContent style={{ padding: 20 }}>
            {/* Search Bar */}
                            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: '#f3f4f6',
              borderRadius: 8,
              paddingHorizontal: 12,
              marginBottom: 16
                            }}>
              <Search size={20} color="#6b7280" />
              <TextInput
                placeholder="Search homework assignments..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                              paddingHorizontal: 8, 
                  fontSize: 16,
                  color: '#111827'
                }}
              />
                            </View>
            
            {/* Filters */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['all', 'published', 'draft'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setFilterStatus(status)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                              borderRadius: 6,
                    backgroundColor: filterStatus === status ? '#3b82f6' : '#f3f4f6'
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: filterStatus === status ? 'white' : '#6b7280',
                    textTransform: 'capitalize'
                  }}>
                    {status}
                              </Text>
                </TouchableOpacity>
              ))}
                      </View>
                      
            {/* Section Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                  onPress={() => setSelectedSection('all')}
                            style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    backgroundColor: selectedSection === 'all' ? '#3b82f6' : '#f3f4f6',
                    minWidth: 80,
                    alignItems: 'center'
                            }}
                          >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: selectedSection === 'all' ? 'white' : '#6b7280'
                  }}>
                    All Sections
                  </Text>
                          </TouchableOpacity>
                {sections.map((section) => (
                          <TouchableOpacity
                    key={section.id}
                    onPress={() => setSelectedSection(section.id)}
                            style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      backgroundColor: selectedSection === section.id ? '#3b82f6' : '#f3f4f6',
                      minWidth: 100,
                      alignItems: 'center'
                            }}
                          >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: selectedSection === section.id ? 'white' : '#6b7280'
                    }}>
                      Grade {section.grade} {section.section}
                    </Text>
                          </TouchableOpacity>
                ))}
                        </View>
            </ScrollView>
                    </CardContent>
                  </Card>

        {/* Homework List */}
        {filteredHomework.length > 0 ? (
          <FlatList
            data={filteredHomework}
            renderItem={renderHomeworkCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
          ) : (
            <Card>
            <CardContent style={{ padding: 40, alignItems: 'center' }}>
              <BookOpen size={48} color="#6b7280" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                {searchQuery ? 'No Matching Homework' : 'No Homework Assignments'}
                </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                {searchQuery 
                  ? 'No homework assignments match your search criteria'
                  : 'Get started by creating your first homework assignment'
                }
                </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={{
                    backgroundColor: '#3b82f6',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginTop: 16,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <Plus size={16} color="white" />
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: '500', marginLeft: 4 }}>
                    Create Homework
                  </Text>
                </TouchableOpacity>
              )}
              </CardContent>
            </Card>
          )}
      </ScrollView>

      {/* Create/Edit Homework Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          setEditingHomework(null);
          resetForm();
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          <View style={{ 
            backgroundColor: 'white', 
            paddingHorizontal: 24,
            paddingVertical: 16,
              borderBottomWidth: 1, 
            borderBottomColor: '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                {editingHomework ? 'Edit Homework' : 'Create Homework'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setEditingHomework(null);
                  resetForm();
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            </View>
            
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
            <View style={{ gap: 20 }}>
              {/* Title */}
                <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                  Title *
                  </Text>
                <TextInput
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="Enter homework title"
                    style={{
                    backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#111827'
                  }}
                />
                </View>

                {/* Subject */}
                <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Subject *
                  </Text>
                  <TextInput
                  value={formData.subject}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
                  placeholder="Enter subject"
                    style={{
                    backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                    paddingVertical: 12,
                      fontSize: 16,
                      color: '#111827'
                    }}
                  />
                </View>

              {/* Section */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                  Section *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {sections.map((section) => (
                      <TouchableOpacity
                        key={section.id}
                        onPress={() => setFormData(prev => ({ ...prev, section_id: section.id }))}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          backgroundColor: formData.section_id === section.id ? '#3b82f6' : '#f3f4f6',
                          minWidth: 120,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: formData.section_id === section.id ? '#3b82f6' : '#d1d5db'
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: formData.section_id === section.id ? 'white' : '#6b7280'
                        }}>
                          Grade {section.grade} {section.section}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Due Date */}
                <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                  Due Date *
                  </Text>
                  <TextInput
                  value={formData.due_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, due_date: text }))}
                  placeholder="YYYY-MM-DD"
                    style={{
                    backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                    paddingVertical: 12,
                      fontSize: 16,
                      color: '#111827'
                    }}
                  />
                </View>

                {/* Description */}
                <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                  Description *
                  </Text>
                  <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Enter homework description and instructions"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                    style={{
                    backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                    paddingVertical: 12,
                      fontSize: 16,
                      color: '#111827',
                    minHeight: 120
                  }}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ 
            backgroundColor: 'white', 
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            gap: 12
          }}>
            <Button
              title={editingHomework ? 'Update & Publish' : 'Create & Publish'}
              onPress={() => editingHomework ? handleUpdateHomework(false) : handleCreateHomework(false)}
              size="lg"
              loading={createHomeworkMutation.isPending || updateHomeworkMutation.isPending}
            />
            <Button
              title={editingHomework ? 'Save as Draft' : 'Save as Draft'}
              onPress={() => editingHomework ? handleUpdateHomework(true) : handleCreateHomework(true)}
              variant="outline"
              size="lg"
              loading={createHomeworkMutation.isPending || updateHomeworkMutation.isPending}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};
