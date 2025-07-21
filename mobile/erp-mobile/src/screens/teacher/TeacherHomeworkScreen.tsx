import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  FileText, 
  Users,
  ChevronDown,
  X,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';

interface Homework {
  id: string;
  school_id: string;
  section: string;
  subject: string;
  title: string;
  description?: string;
  due_date: string;
  file_url?: string;
  created_by: string;
  created_at: string;
}

interface Section {
  id: string;
  grade: number;
  section: string;
  school_id: string;
}

export const TeacherHomeworkScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  
  // Form state
  const [selectedSection, setSelectedSection] = useState('');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's sections
  const { data: sections = [] } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) return [];

      // Try multiple approaches to get teacher sections
      let data, error;

      // First try: section_teachers table
      const sectionTeachersResult = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (sectionTeachersResult.data && sectionTeachersResult.data.length > 0) {
        return sectionTeachersResult.data.map((item: any) => ({
          id: item.sections.id,
          grade: item.sections.grade,
          section: item.sections.section,
          school_id: item.sections.school_id
        }));
      }

      // Second try: periods table (teacher schedule)
      const periodsResult = await supabase
        .from('periods')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (periodsResult.data && periodsResult.data.length > 0) {
        // Deduplicate sections
        const uniqueSections = new Map();
        periodsResult.data.forEach((item: any) => {
          const section = item.sections;
          uniqueSections.set(section.id, {
            id: section.id,
            grade: section.grade,
            section: section.section,
            school_id: section.school_id
          });
        });
        return Array.from(uniqueSections.values());
      }

      // Third try: direct sections table for the same school (fallback)
      const sectionsResult = await supabase
        .from('sections')
        .select('id, grade, section, school_id')
        .eq('school_id', user.school_id)
        .order('grade', { ascending: true })
        .order('section', { ascending: true });

      if (sectionsResult.error) throw sectionsResult.error;
      
      return sectionsResult.data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch homework assignments
  const { data: homework = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-homework', user?.id],
    queryFn: async (): Promise<Homework[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('homeworks')
        .select('*')
        .eq('created_by', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create homework mutation
  const createHomeworkMutation = useMutation({
    mutationFn: async (homeworkData: Omit<Homework, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('homeworks')
        .insert(homeworkData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      resetForm();
      setShowCreateModal(false);
      Alert.alert('Success', 'Homework created successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create homework. Please try again.');
      console.error('Create homework error:', error);
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const resetForm = () => {
    setSelectedSection('');
    setSubject('');
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  const handleSubmit = async () => {
    if (!selectedSection || !subject.trim() || !title.trim() || !dueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const selectedSectionData = sections.find(s => s.id === selectedSection);
    if (!selectedSectionData) {
      Alert.alert('Error', 'Invalid section selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await createHomeworkMutation.mutateAsync({
        school_id: user?.school_id || '',
        section: `${selectedSectionData.grade} ${selectedSectionData.section}`,
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate,
        created_by: user?.id || ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading homework...</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              backgroundColor: '#8b5cf6',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <ClipboardList size={20} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                Homework
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Create and manage assignments
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: '#8b5cf6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '500', marginLeft: 4 }}>
              Create
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', marginTop: 16, marginHorizontal: -6 }}>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' }}>
                {homework.length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Total
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>
                {homework.filter(h => !isOverdue(h.due_date)).length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Active
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ef4444' }}>
                {homework.filter(h => isOverdue(h.due_date)).length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Overdue
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b' }}>
                {[...new Set(homework.map(h => h.subject))].length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Subjects
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ padding: 24 }}>
          {homework.length > 0 ? (
            <View style={{ gap: 16 }}>
              {homework.map((item) => {
                const overdue = isOverdue(item.due_date);
                
                return (
                  <Card key={item.id}>
                    <CardContent style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                            {item.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                            <View style={{ 
                              backgroundColor: '#8b5cf6' + '20', 
                              paddingHorizontal: 8, 
                              paddingVertical: 2, 
                              borderRadius: 4 
                            }}>
                              <Text style={{ fontSize: 12, color: '#8b5cf6', fontWeight: '500' }}>
                                {item.section}
                              </Text>
                            </View>
                            <View style={{ 
                              backgroundColor: '#3b82f6' + '20', 
                              paddingHorizontal: 8, 
                              paddingVertical: 2, 
                              borderRadius: 4 
                            }}>
                              <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: '500' }}>
                                {item.subject}
                              </Text>
                            </View>
                          </View>
                          {item.description && (
                            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                        <View style={{ marginLeft: 8 }}>
                          {overdue ? (
                            <View style={{ 
                              backgroundColor: '#fef2f2', 
                              paddingHorizontal: 8, 
                              paddingVertical: 4, 
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}>
                              <AlertCircle size={12} color="#ef4444" />
                              <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '500', marginLeft: 4 }}>
                                Overdue
                              </Text>
                            </View>
                          ) : (
                            <View style={{ 
                              backgroundColor: '#f0fdf4', 
                              paddingHorizontal: 8, 
                              paddingVertical: 4, 
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}>
                              <CheckCircle size={12} color="#10b981" />
                              <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '500', marginLeft: 4 }}>
                                Active
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Calendar size={14} color="#6b7280" />
                          <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                            Due: {formatDate(item.due_date)}
                          </Text>
                          {item.file_url && (
                            <>
                              <Text style={{ color: '#d1d5db', marginHorizontal: 8 }}>•</Text>
                              <FileText size={14} color="#6b7280" />
                              <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                                Attachment
                              </Text>
                            </>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#f3f4f6',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4
                            }}
                          >
                            <Edit size={14} color="#6b7280" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#fef2f2',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4
                            }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <ClipboardList size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  No Homework Assignments
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                  You haven't created any homework assignments yet. Create your first assignment to get started.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#8b5cf6',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Plus size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '500', marginLeft: 4 }}>
                    Create First Homework
                  </Text>
                </TouchableOpacity>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Create Homework Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            paddingTop: 20,
            maxHeight: '90%'
          }}>
            <View style={{ 
              paddingHorizontal: 24, 
              paddingBottom: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#e5e7eb',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Create Homework
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ padding: 24, gap: 16 }}>
                {/* Section */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Section *
                  </Text>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10
                    }}
                    onPress={() => setShowSectionModal(true)}
                  >
                    <Text style={{ fontSize: 16, color: selectedSection ? '#111827' : '#9ca3af' }}>
                      {selectedSection ? 
                        `Grade ${sections.find(s => s.id === selectedSection)?.grade} ${sections.find(s => s.id === selectedSection)?.section}` : 
                        'Select section'
                      }
                    </Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Subject */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Subject *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                      color: '#111827'
                    }}
                    placeholder="Enter subject"
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>

                {/* Title */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Title *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                      color: '#111827'
                    }}
                    placeholder="Enter homework title"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Description
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                      color: '#111827',
                      minHeight: 80,
                      textAlignVertical: 'top'
                    }}
                    placeholder="Enter homework description..."
                    value={description}
                    onChangeText={setDescription}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                {/* Due Date */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Due Date *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                      color: '#111827'
                    }}
                    placeholder="YYYY-MM-DD"
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Format: YYYY-MM-DD (e.g., 2024-12-25)
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  title="Cancel"
                  onPress={() => setShowCreateModal(false)}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button
                  title={isSubmitting ? "Creating..." : "Create Homework"}
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!selectedSection || !subject.trim() || !title.trim() || !dueDate}
                  style={{ flex: 1, backgroundColor: '#8b5cf6' }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Section Selector Modal */}
      <Modal
        visible={showSectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSectionModal(false)}
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
              Select Section
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {sections.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedSection === section.id ? '#8b5cf6' + '20' : 'transparent'
                  }}
                  onPress={() => {
                    setSelectedSection(section.id);
                    setShowSectionModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedSection === section.id ? '#8b5cf6' : '#111827',
                    fontWeight: selectedSection === section.id ? '600' : '400'
                  }}>
                    Grade {section.grade} {section.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{
                marginTop: 16,
                paddingVertical: 8,
                alignItems: 'center'
              }}
              onPress={() => setShowSectionModal(false)}
            >
              <Text style={{ fontSize: 16, color: '#6b7280' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
