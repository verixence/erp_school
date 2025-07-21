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
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  MessageSquare,
  Clock,
  User,
  Mail,
  Phone,
  Star,
  AlertCircle,
  CheckCircle,
  Reply,
  X,
  Filter
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  subject: string;
  message: string;
  feedback_type: string;
  status: 'pending' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  submitter: {
    name: string;
    email: string;
    phone?: string;
    type: 'parent' | 'student' | 'teacher';
  };
  responses?: {
    id: string;
    message: string;
    created_at: string;
    author: string;
  }[];
}

const FEEDBACK_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'academic', label: 'Academic' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'teaching', label: 'Teaching Methods' },
  { value: 'communication', label: 'Communication' },
  { value: 'extracurricular', label: 'Extracurricular' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'other', label: 'Other' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'resolved', label: 'Resolved', color: '#10B981' }
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priority' },
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' }
];

const TeacherFeedbackScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Fetch feedback submissions
  const { data: feedbacks = [], isLoading, refetch } = useQuery({
    queryKey: ['feedback-submissions', user?.school_id, selectedType, selectedStatus, selectedPriority],
    queryFn: async (): Promise<Feedback[]> => {
      if (!user?.school_id) return [];

      // For now, return mock data since the feedback_box table might not exist
      // In a real implementation, this would fetch from the database
      const mockFeedbacks: Feedback[] = [
        {
          id: '1',
          subject: 'Suggestion for Online Classes',
          message: 'I think it would be great if we could have more interactive online sessions with breakout rooms for group discussions.',
          feedback_type: 'teaching',
          status: 'pending',
          priority: 'medium',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          submitter: {
            name: 'Anonymous Parent',
            email: 'parent@example.com',
            type: 'parent'
          }
        },
        {
          id: '2',
          subject: 'Homework Load Concern',
          message: 'My child seems to be getting too much homework lately. It\'s affecting their sleep and playtime. Could you please review the homework policy?',
          feedback_type: 'academic',
          status: 'in_progress',
          priority: 'high',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          submitter: {
            name: 'Anonymous Parent',
            email: 'parent2@example.com',
            type: 'parent'
          }
        },
        {
          id: '3',
          subject: 'Great Teaching Methods',
          message: 'I wanted to appreciate the innovative teaching methods used in mathematics class. My child has shown significant improvement.',
          feedback_type: 'teaching',
          status: 'resolved',
          priority: 'low',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          submitter: {
            name: 'Anonymous Parent',
            email: 'parent3@example.com',
            type: 'parent'
          }
        }
      ];

      // Apply filters
      let filteredFeedbacks = mockFeedbacks;

      if (selectedType !== 'all') {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.feedback_type === selectedType);
      }

      if (selectedStatus !== 'all') {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.status === selectedStatus);
      }

      if (selectedPriority !== 'all') {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.priority === selectedPriority);
      }

      return filteredFeedbacks;
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openFeedbackDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  const closeFeedbackDetail = () => {
    setShowDetailModal(false);
    setSelectedFeedback(null);
    setResponseMessage('');
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  // Calculate stats
  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    inProgress: feedbacks.filter(f => f.status === 'in_progress').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            backgroundColor: '#f59e0b', 
            padding: 10, 
            borderRadius: 12, 
            marginRight: 12 
          }}>
            <MessageSquare size={24} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
              Feedback Management
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Review and respond to feedback from parents and students
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Card style={{ padding: 16, minWidth: 120, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{stats.total}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Total</Text>
            </Card>
            <Card style={{ padding: 16, minWidth: 120, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Pending</Text>
            </Card>
            <Card style={{ padding: 16, minWidth: 120, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{stats.inProgress}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>In Progress</Text>
            </Card>
            <Card style={{ padding: 16, minWidth: 120, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>{stats.resolved}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Resolved</Text>
            </Card>
          </View>
        </ScrollView>
      </View>

      {/* Filters */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {STATUS_OPTIONS.slice(0, 4).map((status) => (
              <TouchableOpacity
                key={status.value}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedStatus === status.value ? (status.color || '#6b7280') : '#f3f4f6',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => setSelectedStatus(status.value)}
              >
                <Text style={{
                  color: selectedStatus === status.value ? 'white' : '#6b7280',
                  fontWeight: selectedStatus === status.value ? '600' : '400',
                  fontSize: 12
                }}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Feedback List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {feedbacks.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <MessageSquare size={48} color="#6b7280" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              No Feedback Found
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              No feedback submissions match your current filters.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 16 }}>
            {feedbacks.map((feedback) => {
              const priorityInfo = getPriorityInfo(feedback.priority);
              const statusInfo = getStatusInfo(feedback.status);
              
              return (
                <TouchableOpacity
                  key={feedback.id}
                  onPress={() => openFeedbackDetail(feedback)}
                >
                  <Card style={{ padding: 16 }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          backgroundColor: '#f3f4f6',
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <User size={20} color="#6b7280" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            {feedback.submitter.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>
                            {feedback.submitter.type}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Priority Badge */}
                        <View style={{
                          backgroundColor: priorityInfo.color + '20',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12
                        }}>
                          <Text style={{
                            fontSize: 10,
                            color: priorityInfo.color,
                            fontWeight: '500',
                            textTransform: 'uppercase'
                          }}>
                            {feedback.priority}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View style={{
                          backgroundColor: statusInfo.color + '20',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          {feedback.status === 'pending' && <Clock size={10} color={statusInfo.color} />}
                          {feedback.status === 'in_progress' && <AlertCircle size={10} color={statusInfo.color} />}
                          {feedback.status === 'resolved' && <CheckCircle size={10} color={statusInfo.color} />}
                          <Text style={{
                            fontSize: 10,
                            color: statusInfo.color,
                            fontWeight: '500',
                            marginLeft: 4,
                            textTransform: 'capitalize'
                          }}>
                            {feedback.status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Subject */}
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                      {feedback.subject}
                    </Text>

                    {/* Message Preview */}
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 }} numberOfLines={2}>
                      {feedback.message}
                    </Text>

                    {/* Footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={12} color="#6b7280" />
                        <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                          {formatDate(feedback.created_at)}
                        </Text>
                      </View>
                      
                      <View style={{
                        backgroundColor: '#f3f4f6',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12
                      }}>
                        <Text style={{
                          fontSize: 12,
                          color: '#6b7280',
                          textTransform: 'capitalize'
                        }}>
                          {feedback.feedback_type}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

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

                {/* Submitter Info */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    Submitted by:
                  </Text>
                  <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 14, color: '#111827', marginBottom: 4 }}>
                      {selectedFeedback.submitter.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>
                      {selectedFeedback.submitter.type}
                    </Text>
                  </View>
                </View>

                {/* Message */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    Message:
                  </Text>
                  <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                    {selectedFeedback.message}
                  </Text>
                </View>

                {/* Metadata */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Type</Text>
                    <Text style={{ fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>
                      {selectedFeedback.feedback_type}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Priority</Text>
                    <Text style={{ fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>
                      {selectedFeedback.priority}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Status</Text>
                    <Text style={{ fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>
                      {selectedFeedback.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Response Section */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    Your Response:
                  </Text>
                  <TextInput
                    value={responseMessage}
                    onChangeText={setResponseMessage}
                    placeholder="Type your response here..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 14,
                      minHeight: 100,
                      marginBottom: 16
                    }}
                  />
                  
                  <Button
                    title={isSubmittingResponse ? "Sending..." : "Send Response"}
                    onPress={() => Alert.alert('Response', 'Response functionality would be implemented here')}
                    disabled={isSubmittingResponse || !responseMessage.trim()}
                    style={{ 
                      backgroundColor: '#3b82f6',
                      opacity: (isSubmittingResponse || !responseMessage.trim()) ? 0.6 : 1
                    }}
                  />
                </View>
              </Card>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherFeedbackScreen; 