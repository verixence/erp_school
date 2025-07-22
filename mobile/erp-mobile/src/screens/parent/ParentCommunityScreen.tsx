import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  SafeAreaView,
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
  Heart,
  Users,
  X,
  Send,
  Clock,
  User,
  Globe,
  UserCheck,
  GraduationCap,
  Filter,
  ChevronDown,
  MessageCircle,
  Share
} from 'lucide-react-native';

interface Post {
  id: string;
  school_id: string;
  author_id: string;
  title: string;
  body?: string;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  created_at: string;
  updated_at: string;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface Child {
  id: string;
  full_name: string;
  grade: number;
  section: string;
  school_id: string;
}

export const ParentCommunityScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'teachers' | 'parents' | 'students'>('all');
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

  // Fetch posts
  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['community-posts', user?.school_id, selectedAudience],
    queryFn: async (): Promise<Post[]> => {
      if (!user?.school_id) return [];

      // Mock data for demonstration since posts table might not exist
      const mockPosts: Post[] = [
        {
          id: '1',
          school_id: user.school_id,
          author_id: 'teacher1',
          title: 'Welcome Back to the New Academic Year!',
          body: 'We are excited to welcome all students and parents to the new academic year. This year brings many exciting opportunities and new learning experiences for our students.',
          audience: 'all',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          likes_count: 15,
          comments_count: 8,
          is_liked: false,
          author: {
            id: 'teacher1',
            first_name: 'Sarah',
            last_name: 'Johnson',
            role: 'teacher'
          }
        },
        {
          id: '2',
          school_id: user.school_id,
          author_id: 'admin1',
          title: 'Parent-Teacher Conference Schedule',
          body: 'The parent-teacher conferences are scheduled for next week. Please check your email for the specific time slots assigned to your child.',
          audience: 'parents',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          likes_count: 23,
          comments_count: 12,
          is_liked: true,
          author: {
            id: 'admin1',
            first_name: 'Michael',
            last_name: 'Brown',
            role: 'school_admin'
          }
        },
        {
          id: '3',
          school_id: user.school_id,
          author_id: 'teacher2',
          title: 'Science Fair Preparations',
          body: 'Students are doing an amazing job preparing for the upcoming science fair. We encourage all parents to attend and support our young scientists!',
          audience: 'all',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          likes_count: 31,
          comments_count: 5,
          is_liked: false,
          author: {
            id: 'teacher2',
            first_name: 'Emily',
            last_name: 'Davis',
            role: 'teacher'
          }
        }
      ];

      // Apply audience filter
      let filteredPosts = mockPosts;
      if (selectedAudience !== 'all') {
        filteredPosts = filteredPosts.filter(p => p.audience === selectedAudience || p.audience === 'all');
      }

      return filteredPosts;
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  // Fetch comments for a post
  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', selectedPost?.id],
    queryFn: async (): Promise<Comment[]> => {
      if (!selectedPost?.id) return [];

      // Mock comments data
      const mockComments: Comment[] = [
        {
          id: '1',
          post_id: selectedPost.id,
          author_id: 'parent1',
          content: 'Thank you for the update! Looking forward to the new year.',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          author: {
            first_name: 'Jessica',
            last_name: 'Wilson',
            role: 'parent'
          }
        },
        {
          id: '2',
          post_id: selectedPost.id,
          author_id: 'parent2',
          content: 'Great to see such positive communication from the school.',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          author: {
            first_name: 'David',
            last_name: 'Miller',
            role: 'parent'
          }
        }
      ];

      return mockComments;
    },
    enabled: !!selectedPost?.id,
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to like post. Please try again.');
      console.error('Like post error:', error);
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      setCommentText('');
      Alert.alert('Success', 'Comment added successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      console.error('Add comment error:', error);
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLikePost = (postId: string) => {
    likePostMutation.mutate(postId);
  };

  const openCommentsModal = (post: Post) => {
    setSelectedPost(post);
    setShowCommentModal(true);
  };

  const closeCommentsModal = () => {
    setShowCommentModal(false);
    setSelectedPost(null);
    setCommentText('');
  };

  const handleAddComment = () => {
    if (!selectedPost || !commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setIsSubmittingComment(true);
    addCommentMutation.mutate(
      { postId: selectedPost.id, content: commentText.trim() },
      {
        onSettled: () => {
          setIsSubmittingComment(false);
        }
      }
    );
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'teachers': return <UserCheck size={16} color="#059669" />;
      case 'parents': return <Users size={16} color="#7c3aed" />;
      case 'students': return <GraduationCap size={16} color="#dc2626" />;
      default: return <Globe size={16} color="#3b82f6" />;
    }
  };

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'teachers': return '#059669';
      case 'parents': return '#7c3aed';
      case 'students': return '#dc2626';
      default: return '#3b82f6';
    }
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

  const getSelectedAudienceLabel = () => {
    const options = {
      all: 'All Posts',
      teachers: 'Teachers',
      parents: 'Parents',
      students: 'Students'
    };
    return options[selectedAudience] || 'All Posts';
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={{ marginBottom: 16 }}>
      <CardContent style={{ padding: 16 }}>
        {/* Post Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
              {item.author?.first_name} {item.author?.last_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 8, textTransform: 'capitalize' }}>
                {item.author?.role?.replace('_', ' ')}
              </Text>
              <Clock size={12} color="#6b7280" />
              <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <View style={{
            backgroundColor: getAudienceColor(item.audience) + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            {getAudienceIcon(item.audience)}
            <Text style={{
              fontSize: 12,
              color: getAudienceColor(item.audience),
              marginLeft: 4,
              fontWeight: '500',
              textTransform: 'capitalize'
            }}>
              {item.audience}
            </Text>
          </View>
        </View>

        {/* Post Content */}
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
          {item.title}
        </Text>
        {item.body && (
          <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 }}>
            {item.body}
          </Text>
        )}

        {/* Post Actions */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6'
        }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => handleLikePost(item.id)}
          >
            <Heart 
              size={18} 
              color={item.is_liked ? '#ef4444' : '#6b7280'} 
              fill={item.is_liked ? '#ef4444' : 'none'}
            />
            <Text style={{ 
              fontSize: 14, 
              color: item.is_liked ? '#ef4444' : '#6b7280', 
              marginLeft: 6 
            }}>
              {item.likes_count || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => openCommentsModal(item)}
          >
            <MessageCircle size={18} color="#6b7280" />
            <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
              {item.comments_count || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Share size={18} color="#6b7280" />
            <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>Share</Text>
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading community posts...</Text>
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
            backgroundColor: '#7c3aed', 
            padding: 10, 
            borderRadius: 12, 
            marginRight: 12 
          }}>
            <MessageSquare size={24} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
              School Community
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Stay connected with the school community
            </Text>
          </View>
        </View>

        {/* Filter */}
        <View style={{ marginTop: 16 }}>
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
            onPress={() => setShowAudienceModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Filter size={16} color="#6b7280" />
              <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
                {getSelectedAudienceLabel()}
              </Text>
            </View>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
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
                No Posts Available
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                No community posts are available at this time. Check back later for updates from the school.
              </Text>
            </CardContent>
          </Card>
        }
      />

      {/* Audience Filter Modal */}
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
              Filter Posts
            </Text>
            {[
              { key: 'all', label: 'All Posts', icon: Globe },
              { key: 'teachers', label: 'From Teachers', icon: UserCheck },
              { key: 'parents', label: 'From Parents', icon: Users },
              { key: 'students', label: 'From Students', icon: GraduationCap }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedAudience === option.key ? '#7c3aed' + '20' : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => {
                  setSelectedAudience(option.key as any);
                  setShowAudienceModal(false);
                }}
              >
                <option.icon 
                  size={20} 
                  color={selectedAudience === option.key ? '#7c3aed' : '#6b7280'} 
                />
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedAudience === option.key ? '#7c3aed' : '#111827',
                  fontWeight: selectedAudience === option.key ? '600' : '400',
                  marginLeft: 12
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCommentsModal}
      >
        {selectedPost && (
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
              <TouchableOpacity onPress={closeCommentsModal}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Comments
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Post Summary */}
            <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                {selectedPost.title}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                by {selectedPost.author?.first_name} {selectedPost.author?.last_name}
              </Text>
            </View>

            {/* Comments List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {comments.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <MessageCircle size={48} color="#6b7280" style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    No Comments Yet
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                    Be the first to comment on this post!
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {comments.map((comment) => (
                    <Card key={comment.id} style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{
                          backgroundColor: '#f3f4f6',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <User size={16} color="#6b7280" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginRight: 8 }}>
                              {comment.author?.first_name} {comment.author?.last_name}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              {formatDate(comment.created_at)}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 14, color: '#374151', lineHeight: 18 }}>
                            {comment.content}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Add Comment */}
            <View style={{ 
              backgroundColor: 'white', 
              paddingHorizontal: 16, 
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  multiline
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 14,
                    maxHeight: 80
                  }}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={isSubmittingComment || !commentText.trim()}
                  style={{
                    backgroundColor: '#7c3aed',
                    padding: 10,
                    borderRadius: 20,
                    opacity: (isSubmittingComment || !commentText.trim()) ? 0.6 : 1
                  }}
                >
                  <Send size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default ParentCommunityScreen; 