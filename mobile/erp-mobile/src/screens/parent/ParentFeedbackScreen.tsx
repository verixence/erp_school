import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import {
  MessageSquare,
  Send,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen
} from 'lucide-react-native';
import { schoolTheme } from '../../theme/schoolTheme';

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
  const [feedbackType, setFeedbackType] = useState<string>('academic');
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
        responses: []
      }));
    },
    enabled: !!user?.id,
  });

  // Submit feedback mutation
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
      setFeedbackType('academic');
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
      <Card key={feedback.id} style={styles.feedbackCard}>
        <CardContent style={styles.cardContent}>
          {/* Header */}
          <View style={styles.feedbackHeader}>
            <View style={styles.feedbackHeaderLeft}>
              <View style={[styles.typeIconContainer, { backgroundColor: typeColor + '20' }]}>
                <TypeIcon size={20} color={typeColor} />
              </View>
              <View style={styles.feedbackHeaderText}>
                <Text style={styles.feedbackSubject}>{feedback.subject}</Text>
                <Text style={styles.feedbackSubmitter}>
                  {feedback.is_anonymous ? 'Anonymous' : (feedback.submitter_name || 'Submitted by you')}
                </Text>
              </View>
            </View>
          </View>

          {/* Status Badges */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.badgeText, { color: typeColor }]}>
                {(feedback.original_type || feedback.type).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <StatusIcon size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {feedback.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.feedbackDescription}>{feedback.description}</Text>

          {/* Responses */}
          {feedback.responses && feedback.responses.length > 0 && (
            <View style={styles.responseContainer}>
              <View style={styles.responseHeader}>
                <User size={14} color="#3b82f6" />
                <Text style={styles.responseHeaderText}>School Response</Text>
              </View>
              {feedback.responses.map((response, index) => (
                <View key={response.id || index} style={styles.responseItem}>
                  <Text style={styles.responseMessage}>{response.message}</Text>
                  <Text style={styles.responseDate}>
                    {formatDate(response.created_at)} • {response.author}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.feedbackFooter}>
            <View style={styles.dateContainer}>
              <Calendar size={14} color="#6b7280" />
              <Text style={styles.dateText}>
                {formatDate(feedback.created_at)}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  if (childrenLoading || feedbacksLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Feedback</Text>
          <TouchableOpacity
            onPress={() => setShowFeedbackForm(!showFeedbackForm)}
            style={styles.newFeedbackButton}
          >
            <Text style={styles.newFeedbackButtonText}>
              {showFeedbackForm ? 'Cancel' : 'New Feedback'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
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
              style={[
                styles.filterButton,
                statusFilter === filter.key && styles.filterButtonActive
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* New Feedback Form */}
        {showFeedbackForm && (
          <Card style={styles.formCard}>
            <CardContent style={styles.formContent}>
              <Text style={styles.formTitle}>Submit New Feedback</Text>

              {/* Type */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Type:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeButtonContainer}>
                    {[
                      { key: 'academic', label: 'Academic' },
                      { key: 'behavioral', label: 'Behavioral' },
                      { key: 'facilities', label: 'Facilities' },
                      { key: 'teaching', label: 'Teaching' },
                      { key: 'communication', label: 'Communication' },
                      { key: 'suggestion', label: 'Suggestion' },
                      { key: 'complaint', label: 'Complaint' },
                      { key: 'other', label: 'Other' }
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        onPress={() => setFeedbackType(type.key)}
                        style={[
                          styles.typeButton,
                          feedbackType === type.key && styles.typeButtonActive
                        ]}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          feedbackType === type.key && styles.typeButtonTextActive
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Anonymous Option */}
              <View style={styles.anonymousContainer}>
                <Text style={styles.formLabel}>Submit anonymously</Text>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: '#f3f4f6', true: schoolTheme.colors.parent.main }}
                  thumbColor={isAnonymous ? '#fff' : '#fff'}
                />
              </View>

              {/* Subject */}
              <TextInput
                value={feedbackSubject}
                onChangeText={setFeedbackSubject}
                placeholder="Feedback subject..."
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />

              {/* Description */}
              <TextInput
                value={feedbackDescription}
                onChangeText={setFeedbackDescription}
                placeholder="Please describe your feedback in detail..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
              />

              {/* Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  onPress={handleSubmitFeedback}
                  disabled={!feedbackSubject.trim() || !feedbackDescription.trim() || submitFeedbackMutation.isPending}
                  style={[
                    styles.submitButton,
                    (!feedbackSubject.trim() || !feedbackDescription.trim() || submitFeedbackMutation.isPending) && styles.submitButtonDisabled
                  ]}
                >
                  <Send size={16} color="white" />
                  <Text style={styles.submitButtonText}>
                    {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Feedback List */}
        <View style={styles.feedbackList}>
          {filteredFeedbacks.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>
                {statusFilter === 'all'
                  ? 'No feedback submitted yet.\nTap "New Feedback" to get started!'
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...schoolTheme.shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  newFeedbackButton: {
    backgroundColor: schoolTheme.colors.parent.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newFeedbackButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  filterScroll: {
    marginTop: 4,
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: schoolTheme.colors.parent.main,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formCard: {
    marginBottom: 20,
  },
  formContent: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  typeButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: schoolTheme.colors.parent.main,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  typeButtonTextActive: {
    color: 'white',
  },
  anonymousContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'white',
    marginBottom: 12,
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formActions: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: schoolTheme.colors.parent.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  feedbackList: {
    gap: 16,
  },
  feedbackCard: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  feedbackHeader: {
    marginBottom: 12,
  },
  feedbackHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  feedbackHeaderText: {
    flex: 1,
  },
  feedbackSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  feedbackSubmitter: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  feedbackDescription: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  responseContainer: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  responseHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  responseItem: {
    marginBottom: 8,
  },
  responseMessage: {
    fontSize: 14,
    color: '#1e3a8a',
    marginBottom: 4,
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  responseDate: {
    fontSize: 12,
    color: '#3b82f6',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  feedbackFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: schoolTheme.typography.fonts.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    fontFamily: schoolTheme.typography.fonts.regular,
  },
});
