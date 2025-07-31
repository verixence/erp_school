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
  title: string;
  message: string;
  category: 'academic' | 'behavior' | 'facilities' | 'transport' | 'general';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved' | 'closed';
  submitted_at: string;
  response?: string;
  responded_at?: string;
  responder?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  student?: {
    full_name: string;
    grade: number;
    section: string;
  };
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
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<string>('general');
  const [feedbackPriority, setFeedbackPriority] = useState<string>('medium');
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
        .from('parent_feedback')
        .select(`
          id,
          title,
          message,
          category,
          priority,
          status,
          submitted_at,
          response,
          responded_at,
          responder:users!responder_id(first_name, last_name, role),
          student:students!student_id(full_name, grade, section)
        `)
        .eq('parent_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((feedback: any) => ({
        id: feedback.id,
        title: feedback.title,
        message: feedback.message,
        category: feedback.category,
        priority: feedback.priority,
        status: feedback.status,
        submitted_at: feedback.submitted_at,
        response: feedback.response,
        responded_at: feedback.responded_at,
        responder: feedback.responder,
        student: feedback.student
      }));
    },
    enabled: !!user?.id,
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: {
      title: string;
      message: string;
      category: string;
      priority: string;
      student_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('parent_feedback')
        .insert({
          ...feedbackData,
          parent_id: user?.id,
          school_id: user?.school_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-feedback'] });
      setShowFeedbackForm(false);
      setFeedbackTitle('');
      setFeedbackMessage('');
      setFeedbackCategory('general');
      setFeedbackPriority('medium');
      Alert.alert('Success', 'Your feedback has been submitted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic': return BookOpen;
      case 'behavior': return Users;
      case 'facilities': return GraduationCap;
      case 'transport': return Users;
      default: return MessageSquare;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'academic': return '#3b82f6';
      case 'behavior': return '#8b5cf6';
      case 'facilities': return '#f59e0b';
      case 'transport': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'reviewed': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'reviewed': return AlertCircle;
      case 'resolved': return CheckCircle;
      case 'closed': return CheckCircle;
      default: return Clock;
    }
  };

  const handleSubmitFeedback = () => {
    if (!feedbackTitle.trim() || !feedbackMessage.trim()) {
      Alert.alert('Error', 'Please fill in both title and message');
      return;
    }

    submitFeedbackMutation.mutate({
      title: feedbackTitle.trim(),
      message: feedbackMessage.trim(),
      category: feedbackCategory,
      priority: feedbackPriority,
      student_id: selectedChild || undefined
    });
  };

  const renderFeedbackItem = (feedback: FeedbackItem) => {
    const CategoryIcon = getCategoryIcon(feedback.category);
    const StatusIcon = getStatusIcon(feedback.status);
    const categoryColor = getCategoryColor(feedback.category);
    const statusColor = getStatusColor(feedback.status);
    const priorityColor = getPriorityColor(feedback.priority);

    return (
      <Card key={feedback.id} className="mb-4">
        <CardContent className="p-4">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View 
                  className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                  style={{ backgroundColor: categoryColor + '20' }}
                >
                  <CategoryIcon size={16} color={categoryColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {feedback.title}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {feedback.student?.full_name} • Grade {feedback.student?.grade}-{feedback.student?.section}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="flex-row items-center space-x-2">
              <View 
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: priorityColor + '20' }}
              >
                <Text 
                  className="text-xs font-medium capitalize"
                  style={{ color: priorityColor }}
                >
                  {feedback.priority}
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
          <Text className="text-gray-700 mb-3">{feedback.message}</Text>

          {/* Response */}
          {feedback.response && (
            <View className="bg-blue-50 p-3 rounded-lg mb-3">
              <View className="flex-row items-center mb-2">
                <User size={14} color="#3b82f6" />
                <Text className="text-sm font-medium text-blue-900 ml-1">
                  Response from {feedback.responder?.first_name} {feedback.responder?.last_name}
                </Text>
              </View>
              <Text className="text-blue-800 text-sm">{feedback.response}</Text>
              {feedback.responded_at && (
                <Text className="text-blue-600 text-xs mt-1">
                  {formatDate(feedback.responded_at)}
                </Text>
              )}
            </View>
          )}

          {/* Footer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Calendar size={14} color="#6b7280" />
              <Text className="text-sm text-gray-500 ml-1">
                Submitted {formatDate(feedback.submitted_at)}
              </Text>
            </View>
            
            <View 
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: categoryColor + '20' }}
            >
              <Text 
                className="text-xs font-medium capitalize"
                style={{ color: categoryColor }}
              >
                {feedback.category}
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
            { key: 'pending', label: 'Pending' },
            { key: 'reviewed', label: 'Reviewed' },
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

              {/* Category */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">Category:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { key: 'academic', label: 'Academic' },
                    { key: 'behavior', label: 'Behavior' },
                    { key: 'facilities', label: 'Facilities' },
                    { key: 'transport', label: 'Transport' },
                    { key: 'general', label: 'General' }
                  ].map((category) => (
                    <TouchableOpacity
                      key={category.key}
                      onPress={() => setFeedbackCategory(category.key)}
                      className={`mr-2 px-3 py-2 rounded-lg ${
                        feedbackCategory === category.key ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        feedbackCategory === category.key ? 'text-white' : 'text-gray-700'
                      }`}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Priority */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">Priority:</Text>
                <View className="flex-row space-x-2">
                  {[
                    { key: 'low', label: 'Low', color: '#10b981' },
                    { key: 'medium', label: 'Medium', color: '#f59e0b' },
                    { key: 'high', label: 'High', color: '#ef4444' }
                  ].map((priority) => (
                    <TouchableOpacity
                      key={priority.key}
                      onPress={() => setFeedbackPriority(priority.key)}
                      className={`px-3 py-2 rounded-lg ${
                        feedbackPriority === priority.key ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        feedbackPriority === priority.key ? 'text-white' : 'text-gray-700'
                      }`}>
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Title */}
              <TextInput
                value={feedbackTitle}
                onChangeText={setFeedbackTitle}
                placeholder="Feedback title..."
                className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
              />

              {/* Message */}
              <TextInput
                value={feedbackMessage}
                onChangeText={setFeedbackMessage}
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
                  disabled={!feedbackTitle.trim() || !feedbackMessage.trim() || submitFeedbackMutation.isPending}
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
                    setFeedbackTitle('');
                    setFeedbackMessage('');
                    setFeedbackCategory('general');
                    setFeedbackPriority('medium');
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
                  : `No ${statusFilter} feedback found`
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