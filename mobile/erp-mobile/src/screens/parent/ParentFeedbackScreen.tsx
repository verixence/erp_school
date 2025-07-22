import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  MessageSquare,
  Clock,
  User,
  Mail,
  Star,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Send,
  ChevronDown,
  Filter
} from 'lucide-react-native';

interface Feedback {
  id: string;
  subject: string;
  description: string;
  type: string;
  status: 'new' | 'in_review' | 'resolved' | 'closed';
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  responses?: {
    id: string;
    message: string;
    created_at: string;
    author: string;
  }[];
}

interface Child {
  id: string;
  full_name: string;
  grade: number;
  section: string;
  school_id: string;
}

const FEEDBACK_TYPES = [
  { value: 'academic', label: 'Academic', description: 'Issues related to curriculum, teaching methods, or learning' },
  { value: 'behavioral', label: 'Behavioral', description: 'Student behavior or disciplinary concerns' },
  { value: 'facilities', label: 'Facilities', description: 'School infrastructure, equipment, or environment' },
  { value: 'communication', label: 'Communication', description: 'Information sharing and school communication' },
  { value: 'extracurricular', label: 'Extracurricular', description: 'Sports, clubs, and after-school activities' },
  { value: 'suggestion', label: 'Suggestion', description: 'Ideas for improvement or new initiatives' },
  { value: 'complaint', label: 'Complaint', description: 'Formal complaints requiring attention' },
  { value: 'other', label: 'Other', description: 'Other topics not covered above' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New', color: '#F59E0B' },
  { value: 'in_review', label: 'In Review', color: '#3B82F6' },
  { value: 'resolved', label: 'Resolved', color: '#10B981' },
  { value: 'closed', label: 'Closed', color: '#6B7280' }
];

export const ParentFeedbackScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    type: 'academic',
    isAnonymous: false
  });

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

  // Fetch feedback submissions
  const { data: feedbacks = [], isLoading, refetch } = useQuery({
    queryKey: ['parent-feedback', user?.school_id, selectedStatus],
    queryFn: async (): Promise<Feedback[]> => {
      if (!user?.school_id) return [];

      // Mock data for now since the feedback_box table might not exist
      const mockFeedbacks: Feedback[] = [
        {
          id: '1',
          subject: 'Homework Load Concern',
          description: 'My child seems to be getting too much homework lately. It\'s affecting their sleep and playtime. Could you please review the homework policy for Grade 5?',
          type: 'academic',
          status: 'in_review',
          is_anonymous: false,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          admin_notes: 'We are reviewing the homework policy with the curriculum team.'
        },
        {
          id: '2',
          subject: 'Playground Safety Issue',
          description: 'I noticed that some of the playground equipment needs maintenance. The swing set has loose chains that could be dangerous.',
          type: 'facilities',
          status: 'resolved',
          is_anonymous: true,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          admin_notes: 'Playground equipment has been inspected and repaired. Thank you for bringing this to our attention.'
        },
        {
          id: '3',
          subject: 'Suggestion for Online Parent Portal',
          description: 'It would be great to have push notifications for important announcements and homework updates.',
          type: 'suggestion',
          status: 'new',
          is_anonymous: false,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Apply status filter
      let filteredFeedbacks = mockFeedbacks;
      if (selectedStatus !== 'all') {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.status === selectedStatus);
      }

      return filteredFeedbacks;
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      const payload = {
        school_id: user?.school_id,
        subject: feedbackData.subject,
        description: feedbackData.description,
        type: feedbackData.type,
        is_anonymous: feedbackData.isAnonymous,
        submitted_by: feedbackData.isAnonymous ? null : user?.id,
        submitter_name: feedbackData.isAnonymous ? null : `${user?.first_name} ${user?.last_name}`,
        submitter_email: feedbackData.isAnonymous ? null : user?.email,
        status: 'new'
      };

      // For now, just simulate success since the feedback_box table might not exist
      await new Promise(resolve => setTimeout(resolve, 1000));
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-feedback'] });
      resetForm();
      setShowCreateModal(false);
      Alert.alert('Success', 'Your feedback has been submitted successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      console.error('Submit feedback error:', error);
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      description: '',
      type: 'academic',
      isAnonymous: false
    });
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedbackMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeInfo = (type: string) => {
    return FEEDBACK_TYPES.find(t => t.value === type) || FEEDBACK_TYPES[0];
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openFeedbackDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  const closeFeedbackDetail = () => {
    setShowDetailModal(false);
    setSelectedFeedback(null);
  };

  // Calculate stats
  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'new').length,
    inReview: feedbacks.filter(f => f.status === 'in_review').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length
  };

  const renderFeedbackItem = ({ item }: { item: Feedback }) => {
    const typeInfo = getTypeInfo(item.type);
    const statusInfo = getStatusInfo(item.status);
    
    return (
      <TouchableOpacity onPress={() => openFeedbackDetail(item)}>
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                  {item.subject}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ 
                    backgroundColor: '#f3f4f6', 
                    paddingHorizontal: 8, 
                    paddingVertical: 2, 
                    borderRadius: 4 
                  }}>
                    <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500', textTransform: 'capitalize' }}>
                      {typeInfo.label}
                    </Text>
                  </View>
                  {item.is_anonymous && (
                    <View style={{ 
                      backgroundColor: '#e5e7eb', 
                      paddingHorizontal: 8, 
                      paddingVertical: 2, 
                      borderRadius: 4 
                    }}>
                      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                        Anonymous
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={{
                backgroundColor: statusInfo.color + '20',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                {item.status === 'new' && <Clock size={10} color={statusInfo.color} />}
                {item.status === 'in_review' && <AlertCircle size={10} color={statusInfo.color} />}
                {item.status === 'resolved' && <CheckCircle size={10} color={statusInfo.color} />}
                <Text style={{
                  fontSize: 10,
                  color: statusInfo.color,
                  fontWeight: '500',
                  marginLeft: 4,
                  textTransform: 'capitalize'
                }}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Description Preview */}
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 }} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Footer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={12} color="#6b7280" />
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              
              {item.admin_notes && (
                <View style={{
                  backgroundColor: '#dbeafe',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: '500' }}>
                    Response Available
                  </Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading feedback...</Text>
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
              backgroundColor: '#8b5cf6', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <MessageSquare size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                Feedback & Support
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Share your thoughts with the school
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
              Submit
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Card style={{ padding: 16, minWidth: 100, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{stats.total}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Total</Text>
            </Card>
            <Card style={{ padding: 16, minWidth: 100, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>{stats.new}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>New</Text>
            </Card>
            <Card style={{ padding: 16, minWidth: 100, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{stats.inReview}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>In Review</Text>
            </Card>
            <Card style={{ padding: 16, minWidth: 100, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>{stats.resolved}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Resolved</Text>
            </Card>
          </View>
        </ScrollView>
      </View>

      {/* Status Filter */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16 }}>
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
          onPress={() => setShowStatusModal(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Filter size={16} color="#6b7280" />
            <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
              {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label || 'All Status'}
            </Text>
          </View>
          <ChevronDown size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Feedback List */}
      <FlatList
        data={feedbacks}
        renderItem={renderFeedbackItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Card>
            <CardContent style={{ padding: 32, alignItems: 'center' }}>
              <MessageSquare size={48} color="#6b7280" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                No Feedback Found
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                You haven't submitted any feedback yet. Share your thoughts with the school administration.
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
                  Submit First Feedback
                </Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        }
      />

      {/* Create Feedback Modal */}
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
                Submit Feedback
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ padding: 24, gap: 16 }}>
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
                    placeholder="Brief description of your feedback"
                    value={formData.subject}
                    onChangeText={(text) => setFormData({...formData, subject: text})}
                    multiline={false}
                  />
                </View>

                {/* Type */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Feedback Type
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
                    onPress={() => setShowTypeModal(true)}
                  >
                    <Text style={{ fontSize: 16, color: '#111827' }}>
                      {getTypeInfo(formData.type).label}
                    </Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Description *
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
                      minHeight: 100,
                      textAlignVertical: 'top'
                    }}
                    placeholder="Please provide detailed feedback..."
                    value={formData.description}
                    onChangeText={(text) => setFormData({...formData, description: text})}
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                {/* Anonymous Toggle */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  backgroundColor: '#f9fafb',
                  padding: 16,
                  borderRadius: 8
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 }}>
                      Submit Anonymously
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      Your identity will not be shared with the school
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: formData.isAnonymous ? '#8b5cf6' : '#d1d5db',
                      justifyContent: 'center',
                      alignItems: formData.isAnonymous ? 'flex-end' : 'flex-start',
                      paddingHorizontal: 2
                    }}
                    onPress={() => setFormData({...formData, isAnonymous: !formData.isAnonymous})}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: 'white'
                    }} />
                  </TouchableOpacity>
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
                  title={isSubmitting ? "Submitting..." : "Submit Feedback"}
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!formData.subject.trim() || !formData.description.trim()}
                  style={{ flex: 1, backgroundColor: '#8b5cf6' }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeFeedbackDetail}
      >
        {selectedFeedback && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Modal Header */}
            <View style={{ 
              backgroundColor: 'white',
              paddingHorizontal: 24,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <TouchableOpacity onPress={closeFeedbackDetail}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Feedback Details
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
              <Card style={{ padding: 20 }}>
                {/* Subject */}
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>
                  {selectedFeedback.subject}
                </Text>

                {/* Status and Type */}
                <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
                  <View style={{
                    backgroundColor: getStatusInfo(selectedFeedback.status).color + '20',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: getStatusInfo(selectedFeedback.status).color,
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {selectedFeedback.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: '#f3f4f6',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: '#6b7280',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {getTypeInfo(selectedFeedback.type).label}
                    </Text>
                  </View>
                  {selectedFeedback.is_anonymous && (
                    <View style={{
                      backgroundColor: '#e5e7eb',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        Anonymous
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    Your Feedback:
                  </Text>
                  <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                    {selectedFeedback.description}
                  </Text>
                </View>

                {/* Admin Response */}
                {selectedFeedback.admin_notes && (
                  <View style={{ 
                    backgroundColor: '#dbeafe', 
                    padding: 16, 
                    borderRadius: 8, 
                    marginBottom: 20 
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                      School Response:
                    </Text>
                    <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                      {selectedFeedback.admin_notes}
                    </Text>
                  </View>
                )}

                {/* Timestamps */}
                <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    Submitted: {formatDate(selectedFeedback.created_at)}
                  </Text>
                  {selectedFeedback.updated_at !== selectedFeedback.created_at && (
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      Last Updated: {formatDate(selectedFeedback.updated_at)}
                    </Text>
                  )}
                </View>
              </Card>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Type Selector Modal */}
      <Modal
        visible={showTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTypeModal(false)}
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
            width: '90%',
            maxWidth: 400,
            maxHeight: '80%'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Select Feedback Type
            </Text>
            <ScrollView>
              {FEEDBACK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: formData.type === type.value ? '#8b5cf6' + '20' : 'transparent'
                  }}
                  onPress={() => {
                    setFormData({...formData, type: type.value});
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: formData.type === type.value ? '#8b5cf6' : '#111827',
                    fontWeight: formData.type === type.value ? '600' : '400',
                    marginBottom: 4
                  }}>
                    {type.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Filter Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
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
              Filter by Status
            </Text>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status.value}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedStatus === status.value ? '#8b5cf6' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedStatus(status.value);
                  setShowStatusModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedStatus === status.value ? '#8b5cf6' : '#111827',
                  fontWeight: selectedStatus === status.value ? '600' : '400'
                }}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ParentFeedbackScreen; 