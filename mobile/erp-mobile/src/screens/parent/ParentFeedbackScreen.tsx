import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  RefreshControl, 
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  MessageSquare, 
  Star, 
  Send, 
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ThumbsUp,
  BookOpen,
  Users,
  GraduationCap,
  Heart,
  Filter
} from 'lucide-react-native';

interface FeedbackItem {
  id: string;
  subject: string;
  description: string;
  type: 'feedback' | 'suggestion' | 'complaint';
  original_type?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at?: string;
  submitted_by?: string;
  submitter_name?: string;
  submitter_email?: string;
  is_anonymous: boolean;
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
  admission_no: string;
  grade: number;
  section: string;
}

export const ParentFeedbackScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackType, setFeedbackType] = useState<string>('feedback');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch parent's children
  const { data: children = [], isLoading: childrenLoading } = useQuery({
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
            grade,
            section
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        grade: item.students.grade,
        section: item.students.section
      }));
    },
    enabled: !!user?.id,
  });

  // Set default child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch feedback submissions
  const { data: feedbacks = [], isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery({
    queryKey: ['parent-feedback', user?.id],
    queryFn: async (): Promise<FeedbackItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('feedback_box')
        .select(`
          id,
          subject,
          description,
          type,
          original_type,
          status,
          created_at,
          updated_at,
          submitted_by,
          submitter_name,
          submitter_email,
          is_anonymous
        `)
        .eq('submitted_by', user.id)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((feedback: any) => ({
        id: feedback.id,
        subject: feedback.subject,
        description: feedback.description,
        type: feedback.type,
        original_type: feedback.original_type,
        status: feedback.status,
        created_at: feedback.created_at,
        updated_at: feedback.updated_at,
        submitted_by: feedback.submitted_by,
        submitter_name: feedback.submitter_name,
        submitter_email: feedback.submitter_email,
        is_anonymous: feedback.is_anonymous,
        responses: [] // TODO: Implement responses if needed
      }));
    },
    enabled: !!user?.id,
  });

  // Submit feedback mutation - Direct database integration
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: {
      subject: string;
      description: string;
      type: string;
      is_anonymous: boolean;
    }) => {
      const { data, error } = await supabase
        .from('feedback_box')
        .insert({
          school_id: user?.school_id,
          type: feedbackData.type === 'suggestion' ? 'suggestion' : 
                feedbackData.type === 'complaint' ? 'complaint' : 'feedback',
          original_type: feedbackData.type,
          subject: feedbackData.subject,
          description: feedbackData.description,
          submitted_by: feedbackData.is_anonymous ? null : user?.id,
          submitter_name: feedbackData.is_anonymous ? null : `${user?.first_name} ${user?.last_name}`,
          submitter_email: feedbackData.is_anonymous ? null : user?.email,
          is_anonymous: feedbackData.is_anonymous,
          status: 'new'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-feedback'] });
      setShowFeedbackForm(false);
      setFeedbackSubject('');
      setFeedbackDescription('');
      setFeedbackType('feedback');
      setIsAnonymous(false);
      Alert.alert('Success', 'Your feedback has been submitted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchFeedbacks();
    setRefreshing(false);
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (statusFilter === 'all') return true;
    return feedback.status === statusFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feedback': return MessageSquare;
      case 'suggestion': return BookOpen;
      case 'complaint': return AlertCircle;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feedback': return '#3b82f6';
      case 'suggestion': return '#10b981';
      case 'complaint': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return Clock;
      case 'in_progress': return AlertCircle;
      case 'resolved': return CheckCircle;
      case 'closed': return CheckCircle;
      default: return Clock;
    }
  };

  const handleSubmitFeedback = () => {
    if (!feedbackSubject.trim() || !feedbackDescription.trim()) {
      Alert.alert('Error', 'Please fill in both subject and description');
      return;
    }

    submitFeedbackMutation.mutate({
      subject: feedbackSubject.trim(),
      description: feedbackDescription.trim(),
      type: feedbackType,
      is_anonymous: isAnonymous
    });
  };

  const renderFeedbackItem = (feedback: FeedbackItem) => {
    const TypeIcon = getTypeIcon(feedback.type);
    const StatusIcon = getStatusIcon(feedback.status);
    const typeColor = getTypeColor(feedback.type);
    const statusColor = getStatusColor(feedback.status);

    return (
      <Card key={feedback.id} className="mb-4">
        <CardContent className="p-4">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View 
                  className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: typeColor + '20' }}
                >
                  <TypeIcon size={16} color={typeColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {feedback.subject}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {feedback.is_anonymous ? 'Anonymous' : (feedback.submitter_name || 'Submitted by you')}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="flex-row items-center space-x-2">
              <View 
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: typeColor + '20' }}
              >
                <Text 
                  className="text-xs font-medium capitalize"
                  style={{ color: typeColor }}
                >
                  {feedback.original_type || feedback.type}
                </Text>
              </View>
              
              <View 
                className="px-2 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: statusColor + '20' }}
              >
                <StatusIcon size={12} color={statusColor} />
                <Text 
                  className="text-xs font-medium capitalize ml-1"
                  style={{ color: statusColor }}
                >
                  {feedback.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Message */}
          <Text className="text-gray-700 mb-3">{feedback.description}</Text>

          {/* Responses */}
          {feedback.responses && feedback.responses.length > 0 && (
            <View className="bg-blue-50 p-3 rounded-lg mb-3">
              <View className="flex-row items-center mb-2">
                <User size={14} color="#3b82f6" />
                <Text className="text-sm font-medium text-blue-900 ml-1">
                  School Response
                </Text>
              </View>
              {feedback.responses.map((response, index) => (
                <View key={response.id || index} className="mb-2">
                  <Text className="text-blue-800 text-sm">{response.message}</Text>
                  <Text className="text-blue-600 text-xs mt-1">
                    {formatDate(response.created_at)} • {response.author}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Calendar size={14} color="#6b7280" />
              <Text className="text-sm text-gray-500 ml-1">
                Submitted {formatDate(feedback.created_at)}
              </Text>
            </View>
            
            <View 
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: typeColor + '20' }}
            >
              <Text 
                className="text-xs font-medium capitalize"
                style={{ color: typeColor }}
              >
                {feedback.original_type || feedback.type}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  if (childrenLoading || feedbacksLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">Feedback</Text>
          <TouchableOpacity
            onPress={() => setShowFeedbackForm(!showFeedbackForm)}
            className="bg-blue-600 px-3 py-1 rounded-lg"
          >
            <Text className="text-white font-medium">New Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {[
            { key: 'all', label: 'All' },
            { key: 'new', label: 'New' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'closed', label: 'Closed' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setStatusFilter(filter.key)}
              className={`mr-2 px-3 py-2 rounded-lg ${
                statusFilter === filter.key ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                statusFilter === filter.key ? 'text-white' : 'text-gray-700'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* New Feedback Form */}
        {showFeedbackForm && (
          <Card className="my-4">
            <CardContent className="p-4">
              <Text className="font-semibold text-gray-900 mb-3">Submit New Feedback</Text>
              
              {/* Child Selector */}
              {children.length > 1 && (
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Child:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {children.map((child) => (
                      <TouchableOpacity
                        key={child.id}
                        onPress={() => setSelectedChild(child.id)}
                        className={`mr-2 px-3 py-2 rounded-lg ${
                          selectedChild === child.id ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <Text className={`text-sm font-medium ${
                          selectedChild === child.id ? 'text-white' : 'text-gray-700'
                        }`}>
                          {child.full_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Type */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">Type:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { key: 'academic', label: 'Academic' },
                    { key: 'behavioral', label: 'Behavioral' },
                    { key: 'facilities', label: 'Facilities' },
                    { key: 'teaching', label: 'Teaching' },
                    { key: 'communication', label: 'Communication' },
                    { key: 'extracurricular', label: 'Extracurricular' },
                    { key: 'suggestion', label: 'Suggestion' },
                    { key: 'complaint', label: 'Complaint' },
                    { key: 'other', label: 'Other' }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      onPress={() => setFeedbackType(type.key)}
                      className={`mr-2 px-3 py-2 rounded-lg ${
                        feedbackType === type.key ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        feedbackType === type.key ? 'text-white' : 'text-gray-700'
                      }`}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Anonymous Option */}
              <View className="mb-3">
                <TouchableOpacity
                  onPress={() => setIsAnonymous(!isAnonymous)}
                  className="flex-row items-center"
                >
                  <View className={`w-5 h-5 rounded mr-2 border-2 ${
                    isAnonymous ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {isAnonymous && (
                      <CheckCircle size={12} color="white" />
                    )}
                  </View>
                  <Text className="text-sm font-medium text-gray-700">
                    Submit anonymously
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Subject */}
              <TextInput
                value={feedbackSubject}
                onChangeText={setFeedbackSubject}
                placeholder="Feedback subject..."
                className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
              />

              {/* Description */}
              <TextInput
                value={feedbackDescription}
                onChangeText={setFeedbackDescription}
                placeholder="Please describe your feedback in detail..."
                multiline
                numberOfLines={4}
                className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
                style={{ textAlignVertical: 'top' }}
              />

              {/* Actions */}
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={handleSubmitFeedback}
                  disabled={!feedbackSubject.trim() || !feedbackDescription.trim() || submitFeedbackMutation.isPending}
                  className="flex-1 bg-blue-600 px-4 py-2 rounded-lg flex-row items-center justify-center"
                >
                  <Send size={16} color="white" />
                  <Text className="text-white ml-2 font-medium">
                    {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowFeedbackForm(false);
                    setFeedbackSubject('');
                    setFeedbackDescription('');
                    setFeedbackType('feedback');
                    setIsAnonymous(false);
                  }}
                  className="bg-gray-300 px-4 py-2 rounded-lg items-center justify-center"
                >
                  <Text className="text-gray-700 font-medium">Cancel</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Feedback List */}
        <View className="py-4">
          {filteredFeedbacks.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <MessageSquare size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4">
                {statusFilter === 'all' 
                  ? 'No feedback submitted yet. Tap "New Feedback" to get started!'
                  : `No ${statusFilter.replace('_', ' ')} feedback found`
                }
              </Text>
            </View>
          ) : (
            filteredFeedbacks.map(renderFeedbackItem)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 