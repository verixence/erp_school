import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Video,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  Plus,
  Play,
  Pause,
  Edit3,
  Trash2,
  Copy
} from 'lucide-react-native';

interface OnlineClass {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  teacher_id: string;
  section_id: string;
  meeting_url: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  subject: {
    name: string;
  };
  section: {
    name: string;
    grade: number;
  };
  student_count?: number;
}

export const TeacherOnlineClassesScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scheduled' | 'ongoing' | 'completed'>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Fetch online classes
  const { data: onlineClasses = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-online-classes', user?.id],
    queryFn: async (): Promise<OnlineClass[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('online_classes')
        .select(`
          *,
          subject:subjects(name),
          section:sections(name, grade)
        `)
        .eq('teacher_id', user.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch teacher's subjects and sections
  const { data: teacherSubjects = [] } = useQuery({
    queryKey: ['teacher-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('teacher_sections')
        .select(`
          subject_id,
          section_id,
          subject:subjects(id, name),
          section:sections(id, name, grade)
        `)
        .eq('teacher_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create online class mutation
  const createOnlineClass = useMutation({
    mutationFn: async (classData: {
      title: string;
      description?: string;
      subject_id: string;
      section_id: string;
      meeting_url: string;
      scheduled_date: string;
      start_time: string;
      end_time: string;
    }) => {
      const { data, error } = await supabase
        .from('online_classes')
        .insert({
          ...classData,
          teacher_id: user?.id,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-online-classes'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Online class scheduled successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to schedule online class. Please try again.');
    },
  });

  // Update class status mutation
  const updateClassStatus = useMutation({
    mutationFn: async ({ classId, status }: { classId: string, status: string }) => {
      const { error } = await supabase
        .from('online_classes')
        .update({ status })
        .eq('id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-online-classes'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubjectId('');
    setSectionId('');
    setMeetingUrl('');
    setScheduledDate('');
    setStartTime('');
    setEndTime('');
  };

  const handleCreateClass = () => {
    if (!title.trim() || !subjectId || !sectionId || !meetingUrl.trim() || 
        !scheduledDate || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    createOnlineClass.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      subject_id: subjectId,
      section_id: sectionId,
      meeting_url: meetingUrl.trim(),
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
    });
  };

  const handleStartClass = (onlineClass: OnlineClass) => {
    Alert.alert(
      'Start Class',
      'This will mark the class as ongoing and open the meeting link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            updateClassStatus.mutate({ 
              classId: onlineClass.id, 
              status: 'ongoing' 
            });
            Linking.openURL(onlineClass.meeting_url);
          }
        }
      ]
    );
  };

  const handleEndClass = (classId: string) => {
    Alert.alert(
      'End Class',
      'Are you sure you want to end this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: () => updateClassStatus.mutate({ 
            classId, 
            status: 'completed' 
          })
        }
      ]
    );
  };

  const handleCopyLink = (url: string) => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Link Copied', 'Meeting link has been copied to clipboard');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredClasses = onlineClasses.filter(onlineClass => {
    if (selectedFilter === 'all') return true;
    return onlineClass.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'ongoing': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isClassToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {(['all', 'scheduled', 'ongoing', 'completed'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            selectedFilter === filter && styles.activeFilter
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === filter && styles.activeFilterText
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOnlineClass = (onlineClass: OnlineClass) => {
    const statusColor = getStatusColor(onlineClass.status);
    const canStart = onlineClass.status === 'scheduled' && isClassToday(onlineClass.scheduled_date);
    const canEnd = onlineClass.status === 'ongoing';
    
    return (
      <View key={onlineClass.id} style={styles.classCard}>
        <View style={styles.classHeader}>
          <View style={styles.classInfo}>
            <Text style={styles.classTitle} numberOfLines={1}>
              {onlineClass.title}
            </Text>
            <Text style={styles.subjectInfo}>
              {onlineClass.subject.name} • Grade {onlineClass.section.grade} {onlineClass.section.name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {onlineClass.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {onlineClass.description && (
          <Text style={styles.description} numberOfLines={2}>
            {onlineClass.description}
          </Text>
        )}

        <View style={styles.classDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatDate(onlineClass.scheduled_date)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatTime(onlineClass.start_time)} - {formatTime(onlineClass.end_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Users size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {onlineClass.student_count || 0} students
            </Text>
          </View>
        </View>

        <View style={styles.classActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCopyLink(onlineClass.meeting_url)}
          >
            <Copy size={16} color="#6b7280" />
            <Text style={styles.actionText}>Copy Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(onlineClass.meeting_url)}
          >
            <ExternalLink size={16} color="#6b7280" />
            <Text style={styles.actionText}>Join</Text>
          </TouchableOpacity>

          {canStart && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => handleStartClass(onlineClass)}
            >
              <Play size={16} color="#fff" />
              <Text style={[styles.actionText, styles.primaryActionText]}>Start</Text>
            </TouchableOpacity>
          )}

          {canEnd && (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerAction]}
              onPress={() => handleEndClass(onlineClass.id)}
            >
              <Pause size={16} color="#fff" />
              <Text style={[styles.actionText, styles.dangerActionText]}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Online Classes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Online Classes List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading online classes...</Text>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Video size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No online classes found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'You haven\'t scheduled any online classes yet'
                : `No ${selectedFilter} classes`
              }
            </Text>
          </View>
        ) : (
          filteredClasses.map(renderOnlineClass)
        )}
      </ScrollView>

      {/* Create Online Class Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Schedule Online Class</Text>
            <TouchableOpacity 
              onPress={handleCreateClass}
              disabled={createOnlineClass.isPending}
            >
              <Text style={[
                styles.submitButton,
                createOnlineClass.isPending && styles.disabledButton
              ]}>
                Schedule
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Title *</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter class title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textAreaInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional class description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject *</Text>
              <View style={styles.selectContainer}>
                {teacherSubjects.map((ts) => (
                  <TouchableOpacity
                    key={ts.subject.id}
                    style={[
                      styles.selectOption,
                      subjectId === ts.subject.id && styles.selectedOption
                    ]}
                    onPress={() => setSubjectId(ts.subject.id)}
                  >
                    <Text style={[
                      styles.selectText,
                      subjectId === ts.subject.id && styles.selectedText
                    ]}>
                      {ts.subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Section *</Text>
              <View style={styles.selectContainer}>
                {teacherSubjects
                  .filter(ts => !subjectId || ts.subject.id === subjectId)
                  .map((ts) => (
                    <TouchableOpacity
                      key={ts.section.id}
                      style={[
                        styles.selectOption,
                        sectionId === ts.section.id && styles.selectedOption
                      ]}
                      onPress={() => setSectionId(ts.section.id)}
                    >
                      <Text style={[
                        styles.selectText,
                        sectionId === ts.section.id && styles.selectedText
                      ]}>
                        Grade {ts.section.grade} {ts.section.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Meeting URL *</Text>
              <TextInput
                style={styles.textInput}
                value={meetingUrl}
                onChangeText={setMeetingUrl}
                placeholder="https://meet.google.com/..."
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.textInput}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Start Time *</Text>
                <TextInput
                  style={styles.textInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>End Time *</Text>
                <TextInput
                  style={styles.textInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  classInfo: {
    flex: 1,
    marginRight: 12,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subjectInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  classDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  primaryAction: {
    backgroundColor: '#3b82f6',
  },
  dangerAction: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 4,
  },
  primaryActionText: {
    color: '#fff',
  },
  dangerActionText: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  submitButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  disabledButton: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedOption: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedText: {
    color: '#fff',
  },
}); 