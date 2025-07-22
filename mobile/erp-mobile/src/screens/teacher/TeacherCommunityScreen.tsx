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
  StyleSheet,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  MessageSquare,
  Plus,
  Heart,
  Users,
  X,
  Send,
  Clock,
  User,
  Globe,
  UserCheck,
  GraduationCap,
  Upload
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  school_id: string;
  author_id: string;
  title: string;
  body?: string;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

const TeacherCommunityScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'teachers' | 'parents' | 'students'>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'teachers' | 'parents' | 'students'>('all');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Fetch posts
  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['community-posts', user?.school_id, selectedAudience],
    queryFn: async (): Promise<Post[]> => {
      if (!user?.school_id) return [];

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:users!author_id(
            id,
            first_name,
            last_name,
            role
          )
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (selectedAudience !== 'all') {
        query = query.eq('audience', selectedAudience);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: { title: string; body: string; audience: string; media?: string[] }) => {
      const payload = {
        school_id: user?.school_id,
        author_id: user?.id,
        title: postData.title,
        body: postData.body,
        audience: postData.audience,
        media_urls: postData.media || []
      };

      const { data, error } = await supabase
        .from('posts')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Post creation error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      resetForm();
      setShowCreateModal(false);
      Alert.alert('Success', 'Post created successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create post. Please try again.');
      console.error('Create post error:', error);
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setAudience('all');
    setSelectedImages([]);
    setUploadingImages(false);
  };

  const handleImageSelection = () => {
    Alert.alert(
      'Add Images',
      'Choose how you want to add images to your post:',
      [
        {
          text: 'Camera',
          onPress: () => Alert.alert('Info', 'Camera functionality requires expo-image-picker package')
        },
        {
          text: 'Gallery',
          onPress: () => Alert.alert('Info', 'Gallery selection requires expo-image-picker package')
        },
        {
          text: 'URL',
          onPress: () => {
            Alert.prompt(
              'Add Image URL',
              'Enter the URL of the image you want to add:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add',
                  onPress: (url) => {
                    if (url && url.trim()) {
                      setSelectedImages(prev => [...prev, url.trim()]);
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your post');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter content for your post');
      return;
    }

    createPostMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      audience,
      media: selectedImages
    });
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
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: '#dc2626', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <MessageSquare size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                Community
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Share updates and connect with the school community
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={{
              backgroundColor: '#dc2626',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={16} color="white" />
            <Text style={{ color: 'white', marginLeft: 6, fontWeight: '600' }}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Audience Filter */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { key: 'all', label: 'All Posts', icon: Globe },
              { key: 'teachers', label: 'Teachers', icon: UserCheck },
              { key: 'parents', label: 'Parents', icon: Users },
              { key: 'students', label: 'Students', icon: GraduationCap }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedAudience === filter.key ? '#dc2626' : '#f3f4f6',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => setSelectedAudience(filter.key as any)}
              >
                <filter.icon 
                  size={16} 
                  color={selectedAudience === filter.key ? 'white' : '#6b7280'} 
                />
                <Text style={{
                  marginLeft: 6,
                  color: selectedAudience === filter.key ? 'white' : '#6b7280',
                  fontWeight: selectedAudience === filter.key ? '600' : '400'
                }}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Posts List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {posts.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <MessageSquare size={48} color="#6b7280" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              No Posts Yet
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
              Be the first to share something with the community!
            </Text>
            <Button
              title="Create First Post"
              onPress={() => setShowCreateModal(true)}
              style={{ backgroundColor: '#dc2626' }}
            />
          </Card>
        ) : (
          <View style={{ gap: 16 }}>
            {posts.map((post) => (
              <Card key={post.id} style={{ padding: 16 }}>
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
                      {post.author?.first_name} {post.author?.last_name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>
                        {post.author?.role?.replace('_', ' ')}
                      </Text>
                      <Clock size={12} color="#6b7280" />
                      <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                        {formatDate(post.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    backgroundColor: getAudienceColor(post.audience) + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    {getAudienceIcon(post.audience)}
                    <Text style={{
                      fontSize: 12,
                      color: getAudienceColor(post.audience),
                      marginLeft: 4,
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {post.audience}
                    </Text>
                  </View>
                </View>

                {/* Post Content */}
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  {post.title}
                </Text>
                {post.body && (
                  <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                    {post.body}
                  </Text>
                )}

                {/* Post Actions */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#f3f4f6'
                }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Heart size={16} color="#6b7280" />
                    <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MessageSquare size={16} color="#6b7280" />
                    <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>Comment</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
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
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              Create Post
            </Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={createPostMutation.isPending}
              style={{
                backgroundColor: '#dc2626',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                opacity: createPostMutation.isPending ? 0.6 : 1
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {createPostMutation.isPending ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
            <View style={{ gap: 20 }}>
              {/* Title Input */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  Title *
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter post title..."
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16
                  }}
                />
              </View>

              {/* Content Input */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  Content
                </Text>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder="Write your post content..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    minHeight: 120
                  }}
                />
              </View>

              {/* Media Upload */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    Add Images
                  </Text>
                  <TouchableOpacity
                    onPress={handleImageSelection}
                    style={{
                      backgroundColor: '#7c3aed',
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6
                    }}
                  >
                    <Upload size={14} color="white" />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                      Add Image
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {selectedImages.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {selectedImages.map((imageUrl, index) => (
                        <View key={index} style={{ position: 'relative' }}>
                          <Image
                            source={{ uri: imageUrl }}
                            style={{ 
                              width: 80, 
                              height: 80, 
                              borderRadius: 8,
                              backgroundColor: '#f3f4f6'
                            }}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => removeImage(index)}
                            style={{
                              position: 'absolute',
                              top: -5,
                              right: -5,
                              backgroundColor: '#ef4444',
                              borderRadius: 10,
                              width: 20,
                              height: 20,
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <X size={12} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
                
                {selectedImages.length === 0 && (
                  <View style={{
                    backgroundColor: '#f9fafb',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    paddingVertical: 24,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    borderStyle: 'dashed'
                  }}>
                    <Upload size={24} color="#9ca3af" />
                    <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                      Tap "Add Image" to include photos in your post
                    </Text>
                  </View>
                )}
              </View>

              {/* Audience Selection */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  Target Audience
                </Text>
                <View style={{ gap: 8 }}>
                  {[
                    { key: 'all', label: 'Everyone', description: 'Visible to all school members' },
                    { key: 'teachers', label: 'Teachers Only', description: 'Only teachers can see this' },
                    { key: 'parents', label: 'Parents Only', description: 'Only parents can see this' },
                    { key: 'students', label: 'Students Only', description: 'Only students can see this' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={{
                        backgroundColor: audience === option.key ? '#dc262620' : 'white',
                        borderWidth: 1,
                        borderColor: audience === option.key ? '#dc2626' : '#d1d5db',
                        borderRadius: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                      onPress={() => setAudience(option.key as any)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: audience === option.key ? '#dc2626' : '#d1d5db',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        {audience === option.key && (
                          <View style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#dc2626'
                          }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: audience === option.key ? '#dc2626' : '#111827'
                        }}>
                          {option.label}
                        </Text>
                        <Text style={{
                          fontSize: 14,
                          color: audience === option.key ? '#dc2626' : '#6b7280'
                        }}>
                          {option.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherCommunityScreen; 