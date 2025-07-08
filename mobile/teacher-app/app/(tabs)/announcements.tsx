import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAnnouncements, useCreateAnnouncement } from '../../src/hooks/useTeacherData';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { data: announcements = [], isLoading, refetch } = useAnnouncements(user?.school_id);
  const createAnnouncementMutation = useCreateAnnouncement();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    target_audience: 'all' as 'all' | 'teachers' | 'students' | 'parents',
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    try {
      await createAnnouncementMutation.mutateAsync({
        ...newAnnouncement,
        school_id: user?.school_id,
        created_by: user?.id,
        published_at: new Date().toISOString(),
      });
      
      setShowCreateModal(false);
      setNewAnnouncement({
        title: '',
        content: '',
        priority: 'normal',
        target_audience: 'all',
      });
      Alert.alert('Success', 'Announcement created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create announcement');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'alert-circle';
      case 'high': return 'warning';
      case 'normal': return 'information-circle';
      case 'low': return 'chatbubble';
      default: return 'information-circle';
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'teachers': return 'school';
      case 'students': return 'people';
      case 'parents': return 'home';
      default: return 'globe';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSubtitle}>Share updates with the community</Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="megaphone" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{announcements.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statNumber}>
              {announcements.filter(a => a.priority === 'urgent').length}
            </Text>
            <Text style={styles.statLabel}>Urgent</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>
              {announcements.filter(a => {
                const publishedDate = new Date(a.published_at);
                const today = new Date();
                return publishedDate.toDateString() === today.toDateString();
              }).length}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>

        {/* Announcements List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Announcements</Text>
          
          {announcements.length > 0 ? (
            <View style={styles.announcementsList}>
              {announcements.map((announcement, index) => (
                <View key={index} style={styles.announcementCard}>
                  <View style={styles.announcementHeader}>
                    <View style={styles.announcementMeta}>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.priority) }]}>
                        <Ionicons 
                          name={getPriorityIcon(announcement.priority) as any} 
                          size={12} 
                          color="#ffffff" 
                        />
                        <Text style={styles.priorityText}>
                          {announcement.priority.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.audienceBadge}>
                        <Ionicons 
                          name={getAudienceIcon(announcement.target_audience) as any} 
                          size={12} 
                          color="#6B7280" 
                        />
                        <Text style={styles.audienceText}>
                          {announcement.target_audience}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.announcementDate}>
                      {new Date(announcement.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>

                  <Text style={styles.announcementTitle}>
                    {announcement.title}
                  </Text>
                  
                  <Text style={styles.announcementContent} numberOfLines={3}>
                    {announcement.content}
                  </Text>

                  <View style={styles.announcementActions}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="eye" size={16} color="#3B82F6" />
                      <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="create" size={16} color="#F59E0B" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="share" size={16} color="#10B981" />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Announcements</Text>
              <Text style={styles.emptyStateText}>
                Create your first announcement to share updates with the community.
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyActionButtonText}>Create Announcement</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Announcement Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity 
              onPress={handleCreateAnnouncement}
              disabled={createAnnouncementMutation.isPending}
            >
              <Text style={[
                styles.modalCreateButton,
                createAnnouncementMutation.isPending && styles.modalCreateButtonDisabled
              ]}>
                {createAnnouncementMutation.isPending ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter announcement title"
                  value={newAnnouncement.title}
                  onChangeText={(text) => setNewAnnouncement({...newAnnouncement, title: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Content</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter announcement content"
                  value={newAnnouncement.content}
                  onChangeText={(text) => setNewAnnouncement({...newAnnouncement, content: text})}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newAnnouncement.priority}
                    onValueChange={(value) => setNewAnnouncement({...newAnnouncement, priority: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Low Priority" value="low" />
                    <Picker.Item label="Normal" value="normal" />
                    <Picker.Item label="High Priority" value="high" />
                    <Picker.Item label="Urgent" value="urgent" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Audience</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newAnnouncement.target_audience}
                    onValueChange={(value) => setNewAnnouncement({...newAnnouncement, target_audience: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Everyone" value="all" />
                    <Picker.Item label="Teachers Only" value="teachers" />
                    <Picker.Item label="Students Only" value="students" />
                    <Picker.Item label="Parents Only" value="parents" />
                  </Picker>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  announcementsList: {
    gap: 16,
  },
  announcementCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  announcementMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  audienceText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  announcementDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  announcementActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 60,
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCreateButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalCreateButtonDisabled: {
    color: '#9CA3AF',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  picker: {
    height: 50,
  },
}); 