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
  MessageSquare, 
  Plus, 
  Users, 
  Bell, 
  AlertCircle, 
  ChevronDown,
  Send,
  X,
  Edit,
  Trash2
} from 'lucide-react-native';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  created_at: string;
  created_by: string;
  school_id: string;
  author?: {
    first_name: string;
    last_name: string;
  };
}

export const TeacherAnnouncementsScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'teachers' | 'parents' | 'students'>('all');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch announcements
  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-announcements', user?.school_id],
    queryFn: async (): Promise<Announcement[]> => {
      if (!user?.school_id) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:users!announcements_created_by_fkey(first_name, last_name)
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id,
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: Omit<Announcement, 'id' | 'created_at' | 'author'>) => {
      const payload = {
        school_id: user?.school_id,
        title: announcementData.title,
        content: announcementData.content,
        target_audience: announcementData.target_audience,
        priority: announcementData.priority,
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Announcement creation error:', error);
        throw error;
      }

      // Don't create notifications for now to avoid foreign key issues
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      resetForm();
      setShowCreateModal(false);
      Alert.alert('Success', 'Announcement created successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create announcement. Please try again.');
      console.error('Create announcement error:', error);
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTargetAudience('all');
    setPriority('normal');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAnnouncementMutation.mutateAsync({
        school_id: user?.school_id || '',
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        priority,
        is_published: true,
        created_by: user?.id || ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAudienceBadge = (audience: string) => {
    const audiences = {
      all: { label: 'Everyone', color: '#3b82f6' },
      teachers: { label: 'Teachers', color: '#10b981' },
      parents: { label: 'Parents', color: '#f59e0b' },
      students: { label: 'Students', color: '#8b5cf6' }
    };
    return audiences[audience as keyof typeof audiences] || audiences.all;
  };

  const getPriorityBadge = (priority: string) => {
    const priorities = {
      low: { label: 'Low', color: '#6b7280' },
      normal: { label: 'Normal', color: '#3b82f6' },
      high: { label: 'High', color: '#f59e0b' },
      urgent: { label: 'Urgent', color: '#ef4444' }
    };
    return priorities[priority as keyof typeof priorities] || priorities.normal;
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

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading announcements...</Text>
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
              backgroundColor: '#ef4444',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <MessageSquare size={20} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                Announcements
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Create and manage announcements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: '#ef4444',
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
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ padding: 24 }}>
          {announcements.length > 0 ? (
            <View style={{ gap: 16 }}>
              {announcements.map((announcement) => {
                const audienceBadge = getAudienceBadge(announcement.target_audience);
                const priorityBadge = getPriorityBadge(announcement.priority);
                
                return (
                  <Card key={announcement.id}>
                    <CardContent style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                            {announcement.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <View style={{ 
                              backgroundColor: audienceBadge.color + '20', 
                              paddingHorizontal: 8, 
                              paddingVertical: 2, 
                              borderRadius: 4 
                            }}>
                              <Text style={{ fontSize: 12, color: audienceBadge.color, fontWeight: '500' }}>
                                {audienceBadge.label}
                              </Text>
                            </View>
                            <View style={{ 
                              backgroundColor: priorityBadge.color + '20', 
                              paddingHorizontal: 8, 
                              paddingVertical: 2, 
                              borderRadius: 4 
                            }}>
                              <Text style={{ fontSize: 12, color: priorityBadge.color, fontWeight: '500' }}>
                                {priorityBadge.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {announcement.priority === 'urgent' && (
                          <View style={{ marginLeft: 8 }}>
                            <AlertCircle size={20} color="#ef4444" />
                          </View>
                        )}
                      </View>
                      
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 }}>
                        {announcement.content}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            By {announcement.author?.first_name} {announcement.author?.last_name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            {formatDate(announcement.created_at)}
                          </Text>
                        </View>
                        {announcement.created_by === user?.id && (
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
                        )}
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card>
              <CardContent style={{ padding: 32, alignItems: 'center' }}>
                <MessageSquare size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  No Announcements Yet
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                  Create your first announcement to share important information with the school community.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#ef4444',
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
                    Create First Announcement
                  </Text>
                </TouchableOpacity>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Create Announcement Modal */}
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
                Create Announcement
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ padding: 24, gap: 16 }}>
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
                    placeholder="Enter announcement title"
                    value={title}
                    onChangeText={setTitle}
                    multiline={false}
                  />
                </View>

                {/* Content */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Content *
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
                    placeholder="Share important information or updates..."
                    value={content}
                    onChangeText={setContent}
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                {/* Target Audience */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Target Audience
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
                    onPress={() => setShowAudienceModal(true)}
                  >
                    <Text style={{ fontSize: 16, color: '#111827' }}>
                      {getAudienceBadge(targetAudience).label}
                    </Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Priority */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 8 }}>
                    Priority Level
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
                    onPress={() => setShowPriorityModal(true)}
                  >
                    <Text style={{ fontSize: 16, color: '#111827' }}>
                      {getPriorityBadge(priority).label}
                    </Text>
                    <ChevronDown size={16} color="#6b7280" />
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
                  title={isSubmitting ? "Creating..." : "Create Announcement"}
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!title.trim() || !content.trim()}
                  style={{ flex: 1, backgroundColor: '#ef4444' }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audience Selector Modal */}
      <Modal
        visible={showAudienceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAudienceModal(false)}
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
              Select Audience
            </Text>
            {[
              { key: 'all', label: 'Everyone' },
              { key: 'teachers', label: 'Teachers Only' },
              { key: 'parents', label: 'Parents Only' },
              { key: 'students', label: 'Students Only' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: targetAudience === option.key ? '#ef4444' + '20' : 'transparent'
                }}
                onPress={() => {
                  setTargetAudience(option.key as any);
                  setShowAudienceModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: targetAudience === option.key ? '#ef4444' : '#111827',
                  fontWeight: targetAudience === option.key ? '600' : '400'
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Priority Selector Modal */}
      <Modal
        visible={showPriorityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPriorityModal(false)}
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
              Select Priority
            </Text>
            {[
              { key: 'low', label: 'Low Priority' },
              { key: 'normal', label: 'Normal' },
              { key: 'high', label: 'High Priority' },
              { key: 'urgent', label: 'Urgent' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: priority === option.key ? '#ef4444' + '20' : 'transparent'
                }}
                onPress={() => {
                  setPriority(option.key as any);
                  setShowPriorityModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: priority === option.key ? '#ef4444' : '#111827',
                  fontWeight: priority === option.key ? '600' : '400'
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
