import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Linking, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import * as DocumentPicker from 'expo-document-picker';
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
  Edit3,
  Paperclip,
  ExternalLink,
  Upload,
  File
} from 'lucide-react-native';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  section_id: string;
  section: string;
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
  file_url?: string;
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
  const [showChildSelector, setShowChildSelector] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'due_soon'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionType, setSubmissionType] = useState<'online' | 'offline'>('online');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadingSubmission, setUploadingSubmission] = useState(false);

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
            section
          )
        `)
        .eq('parent_id', user.id)
        .eq('students.school_id', user.school_id);

      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }

      console.log('Raw children data:', data);

      return (data || []).map((item: any) => {
        const sectionParts = item.students.section?.split(' ') || [];
        const grade = sectionParts[1] ? parseInt(sectionParts[1]) : 1;
        const section = sectionParts[2] || 'A';
        
        return {
          id: item.students.id,
          full_name: item.students.full_name,
          admission_no: item.students.admission_no,
          section_id: item.students.section,
          section: item.students.section,
          sections: {
            id: item.students.id, // placeholder
            grade: grade,
            section: section
          }
        };
      });
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

      console.log('Fetching homework for child:', currentChild.full_name, 'Section:', currentChild.section, 'School ID:', user?.school_id);
      
      // Try multiple section formats to ensure compatibility
      const possibleSectionFormats = [
        currentChild.section, // Original format
        `Grade ${currentChild.sections?.grade} ${currentChild.sections?.section}`, // Grade X Y format
        currentChild.section?.replace('Grade ', ''), // Remove "Grade " prefix if exists
        currentChild.sections ? `${currentChild.sections.grade} ${currentChild.sections.section}` : null // Simple X Y format
      ].filter(Boolean);
      
      console.log('Trying section formats:', possibleSectionFormats);
      
      const { data, error } = await supabase
        .from('homeworks')
        .select(`
          id,
          title,
          description,
          subject,
          due_date,
          section,
          created_by,
          created_at,
          file_url
        `)
        .in('section', possibleSectionFormats)
        .eq('school_id', user?.school_id)
        .order('due_date', { ascending: false });

      console.log('Homework query result:', { data, error });

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
            assigned_date: homeworkItem.created_at,
            section_id: homeworkItem.section,
            teacher_id: homeworkItem.created_by,
            is_published: true,
            sections: { 
              grade: parseInt(homeworkItem.section.split(' ')[1] || '1'), 
              section: homeworkItem.section.split(' ')[2] || 'A' 
            },
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

  // Homework submission mutation
  const submitHomeworkMutation = useMutation({
    mutationFn: async ({ homeworkId, studentId, submissionType, notes, file }: {
      homeworkId: string;
      studentId: string;
      submissionType: 'online' | 'offline';
      notes: string;
      file?: DocumentPicker.DocumentPickerAsset;
    }) => {
      let fileUrl = null;
      
      // Upload file if provided and submission type is online
      if (file && submissionType === 'online') {
        setUploadingSubmission(true);
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `homework-submissions/${user?.school_id}/${fileName}`;
          
          const response = await fetch(file.uri);
          const blob = await response.blob();
          
          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, blob, {
              contentType: file.mimeType || 'application/octet-stream'
            });
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);
            
          fileUrl = publicUrl;
        } catch (uploadError) {
          Alert.alert('Upload Error', 'Failed to upload file. Please try again.');
          throw uploadError;
        } finally {
          setUploadingSubmission(false);
        }
      }

      // Insert or update submission
      const { error } = await supabase
        .from('homework_submissions')
        .upsert({
          homework_id: homeworkId,
          student_id: studentId,
          school_id: user?.school_id,
          file_url: fileUrl,
          notes: notes || (submissionType === 'offline' ? 'Completed offline' : ''),
          status: 'submitted',
          submission_type: submissionType,
          submitted_at: new Date().toISOString()}, {
          onConflict: 'homework_id,student_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Homework submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['child-homework'] });
      setShowSubmissionModal(false);
      resetSubmissionForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit homework');
    }});

  const resetSubmissionForm = () => {
    setSubmissionNotes('');
    setSubmissionType('online');
    setSelectedFile(null);
    setSelectedHomework(null);
  };

  const handleFileSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true});

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleSubmitHomework = () => {
    if (!selectedHomework || !selectedChild) return;
    
    if (submissionType === 'online' && !selectedFile && !submissionNotes.trim()) {
      Alert.alert('Validation Error', 'Please add notes or upload a file for online submission');
      return;
    }

    submitHomeworkMutation.mutate({
      homeworkId: selectedHomework.id,
      studentId: selectedChild,
      submissionType,
      notes: submissionNotes,
      file: selectedFile || undefined
    });
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
              onPress={() => setShowChildSelector(true)}
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
                      
                      {/* Attachment */}
                      {hw.file_url && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(hw.file_url)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#e2e8f0'
                          }}
                        >
                          <Paperclip size={16} color="#64748b" />
                          <Text style={{ fontSize: 14, color: '#475569', marginLeft: 8, flex: 1 }}>
                            View Attachment
                          </Text>
                          <ExternalLink size={16} color="#64748b" />
                        </TouchableOpacity>
                      )}
                      
                      {hw.homework_submissions && hw.homework_submissions.length > 0 ? (
                        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#15803d', marginBottom: 4 }}>
                            Submitted
                          </Text>
                          <Text style={{ fontSize: 12, color: '#166534' }}>
                            Submitted on: {new Date(hw.homework_submissions[0].submitted_at).toLocaleDateString()}
                          </Text>
                          {hw.homework_submissions[0].file_url && (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(hw.homework_submissions[0].file_url!)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 8,
                                padding: 8,
                                backgroundColor: '#dcfce7',
                                borderRadius: 6
                              }}
                            >
                              <Paperclip size={14} color="#16a34a" />
                              <Text style={{ fontSize: 12, color: '#16a34a', marginLeft: 6 }}>
                                View Submitted File
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedHomework(hw);
                              setSubmissionType('online');
                              setShowSubmissionModal(true);
                            }}
                            style={{
                              flex: 1,
                              backgroundColor: '#3b82f6',
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Upload size={16} color="white" />
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 6 }}>
                              Submit
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedHomework(hw);
                              setSubmissionType('offline');
                              setSubmissionNotes('');
                              submitHomeworkMutation.mutate({
                                homeworkId: hw.id,
                                studentId: selectedChild,
                                submissionType: 'offline',
                                notes: 'Completed offline',
                                file: undefined
                              });
                            }}
                            style={{
                              flex: 1,
                              backgroundColor: '#10b981',
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <CheckCircle size={16} color="white" />
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 6 }}>
                              Mark Done
                            </Text>
                          </TouchableOpacity>
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

      {/* Child Selector Modal */}
      {showChildSelector && (
        <Modal
          visible={showChildSelector}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowChildSelector(false)}
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
                  Select Child
                </Text>
                <TouchableOpacity
                  onPress={() => setShowChildSelector(false)}
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
            
            <ScrollView style={{ flex: 1, padding: 24 }}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => {
                    setSelectedChild(child.id);
                    setShowChildSelector(false);
                  }}
                  style={{
                    backgroundColor: selectedChild === child.id ? '#eff6ff' : 'white',
                    padding: 20,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: selectedChild === child.id ? 2 : 1,
                    borderColor: selectedChild === child.id ? '#3b82f6' : '#e5e7eb'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: 25,
                      backgroundColor: selectedChild === child.id ? '#3b82f6' : '#10b981',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16
                    }}>
                      <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                        {child.full_name.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                        {child.full_name}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>
                        Grade {child.sections?.grade} - Section {child.sections?.section}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                        Admission No: {child.admission_no}
                      </Text>
                    </View>
                    {selectedChild === child.id && (
                      <CheckCircle size={24} color="#3b82f6" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Homework Submission Modal */}
      {showSubmissionModal && selectedHomework && (
        <Modal
          visible={showSubmissionModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowSubmissionModal(false);
            resetSubmissionForm();
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
                  Submit Homework
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowSubmissionModal(false);
                    resetSubmissionForm();
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
            
            <ScrollView style={{ flex: 1, padding: 24 }}>
              {/* Homework Info */}
              <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                  {selectedHomework.title}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                  {selectedHomework.subject}
                </Text>
                <Text style={{ fontSize: 14, color: '#374151' }}>
                  {selectedHomework.description}
                </Text>
              </View>

              {/* Submission Type */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 12 }}>
                  Submission Type
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setSubmissionType('online')}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: submissionType === 'online' ? '#eff6ff' : '#f3f4f6',
                      borderWidth: 2,
                      borderColor: submissionType === 'online' ? '#3b82f6' : '#e5e7eb'
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: submissionType === 'online' ? '#3b82f6' : '#6b7280',
                      textAlign: 'center'
                    }}>
                      Online Submission
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setSubmissionType('offline')}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: submissionType === 'offline' ? '#f0fdf4' : '#f3f4f6',
                      borderWidth: 2,
                      borderColor: submissionType === 'offline' ? '#10b981' : '#e5e7eb'
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: submissionType === 'offline' ? '#10b981' : '#6b7280',
                      textAlign: 'center'
                    }}>
                      Mark as Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                  Notes {submissionType === 'online' ? '(Optional)' : ''}
                </Text>
                <TextInput
                  value={submissionNotes}
                  onChangeText={setSubmissionNotes}
                  placeholder={submissionType === 'offline' ? 'Add any additional notes...' : 'Add notes about your submission...'}
                  multiline
                  numberOfLines={4}
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
                    minHeight: 100
                  }}
                />
              </View>

              {/* File Upload (only for online submissions) */}
              {submissionType === 'online' && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Attach File (Optional)
                  </Text>
                  
                  {!selectedFile ? (
                    <TouchableOpacity
                      onPress={handleFileSelection}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderWidth: 2,
                        borderColor: '#e2e8f0',
                        borderStyle: 'dashed',
                        borderRadius: 8,
                        padding: 20,
                        alignItems: 'center'
                      }}
                    >
                      <Upload size={24} color="#64748b" />
                      <Text style={{ fontSize: 14, color: '#475569', marginTop: 8, textAlign: 'center' }}>
                        Tap to upload a file
                      </Text>
                      <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                        PDF, DOC, DOCX, or Images
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{
                      backgroundColor: '#f0f9ff',
                      borderWidth: 1,
                      borderColor: '#bae6fd',
                      borderRadius: 8,
                      padding: 12
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <File size={20} color="#0284c7" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#0c4a6e' }}>
                            {selectedFile.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#0369a1' }}>
                            {Math.round(selectedFile.size! / 1024)} KB
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setSelectedFile(null)}
                          style={{
                            backgroundColor: '#ef4444',
                            padding: 6,
                            borderRadius: 4
                          }}
                        >
                          <X size={14} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Submit Button */}
            <View style={{ 
              backgroundColor: 'white', 
              paddingHorizontal: 24,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb'
            }}>
              <Button
                title={uploadingSubmission ? 'Uploading...' : 'Submit Homework'}
                onPress={handleSubmitHomework}
                size="lg"
                loading={submitHomeworkMutation.isPending || uploadingSubmission}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};
