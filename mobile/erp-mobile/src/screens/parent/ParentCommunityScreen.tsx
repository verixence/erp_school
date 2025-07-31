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
import { Button } from '../../components/ui/Button';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Reply,
  Send,
  Users,
  Calendar,
  Pin,
  MessageCircle,
  Heart,
  Share,
  MoreHorizontal,
  User,
  Clock
} from 'lucide-react-native';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  author: {
    first_name: string;
    last_name: string;
    role: string;
  };
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export const ParentCommunityScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  // Fetch community posts
  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['community-posts', user?.school_id],
    queryFn: async (): Promise<CommunityPost[]> => {
      if (!user?.school_id) return [];

      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          updated_at,
          author_id,
          is_pinned,
          author:users!author_id(first_name, last_name, role),
          community_likes(count),
          community_comments(count),
          community_likes!left(user_id)
        `)
        .eq('school_id', user.school_id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author_id: post.author_id,
        author: post.author,
        is_pinned: post.is_pinned,
        likes_count: post.community_likes?.[0]?.count || 0,
        comments_count: post.community_comments?.[0]?.count || 0,
        user_liked: post.community_likes?.some((like: any) => like.user_id === user.id) || false
      }));
    },
    enabled: !!user?.school_id,
  });

  // Fetch comments for selected post
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['post-comments', selectedPost],
    queryFn: async (): Promise<Comment[]> => {
      if (!selectedPost) return [];

      const { data, error } = await supabase
        .from('community_comments')
        .select(`
          id,
          post_id,
          content,
          created_at,
          author_id,
          author:users!author_id(first_name, last_name, role)
        `)
        .eq('post_id', selectedPost)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((comment: any) => ({
        id: comment.id,
        post_id: comment.post_id,
        content: comment.content,
        created_at: comment.created_at,
        author_id: comment.author_id,
        author: comment.author
      }));
    },
    enabled: !!selectedPost,
  });

  // Create new post mutation
  const createPostMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          title,
          content,
          author_id: user?.id,
          school_id: user?.school_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPostForm(false);
      Alert.alert('Success', 'Post created successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          content,
          author_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', selectedPost] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      setNewComment('');
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('community_likes')
          .insert({
            post_id: postId,
            user_id: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchPosts();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return '#10b981';
      case 'parent': return '#3b82f6';
      case 'admin': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }
    
    createPostMutation.mutate({
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedPost) return;
    
    addCommentMutation.mutate({
      postId: selectedPost,
      content: newComment.trim(),
    });
  };

  const handleLikePost = (postId: string, isLiked: boolean) => {
    likePostMutation.mutate({ postId, isLiked });
  };

  if (postsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedPost) {
    const post = posts.find(p => p.id === selectedPost);
    if (!post) return null;

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <TouchableOpacity
            onPress={() => setSelectedPost(null)}
            className="flex-row items-center"
          >
            <Text className="text-blue-600 text-lg font-semibold">← Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {/* Post Details */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <User size={16} color="#6b7280" />
                  </View>
                  <View>
                    <Text className="font-semibold text-gray-900">
                      {post.author.first_name} {post.author.last_name}
                    </Text>
                    <Text className="text-xs" style={{ color: getRoleColor(post.author.role) }}>
                      {post.author.role.charAt(0).toUpperCase() + post.author.role.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-500">{formatDate(post.created_at)}</Text>
              </View>
              
              {post.is_pinned && (
                <View className="flex-row items-center mb-2">
                  <Pin size={14} color="#f59e0b" />
                  <Text className="text-amber-600 text-xs ml-1 font-medium">Pinned</Text>
                </View>
              )}
              
              <Text className="text-lg font-semibold text-gray-900 mb-2">{post.title}</Text>
              <Text className="text-gray-700 mb-3">{post.content}</Text>
              
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => handleLikePost(post.id, post.user_liked)}
                  className="flex-row items-center"
                >
                  <Heart size={16} color={post.user_liked ? '#ef4444' : '#6b7280'} />
                  <Text className="text-sm text-gray-600 ml-1">{post.likes_count}</Text>
                </TouchableOpacity>
                
                <View className="flex-row items-center">
                  <MessageCircle size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-1">{post.comments_count}</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Comments */}
          <Text className="text-lg font-semibold text-gray-900 mb-3">Comments</Text>
          
          {comments.map((comment) => (
            <Card key={comment.id} className="mb-3">
              <CardContent className="p-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                      <User size={12} color="#6b7280" />
                    </View>
                    <View>
                      <Text className="font-medium text-gray-900 text-sm">
                        {comment.author.first_name} {comment.author.last_name}
                      </Text>
                      <Text className="text-xs" style={{ color: getRoleColor(comment.author.role) }}>
                        {comment.author.role.charAt(0).toUpperCase() + comment.author.role.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-500">{formatDate(comment.created_at)}</Text>
                </View>
                <Text className="text-gray-700">{comment.content}</Text>
              </CardContent>
            </Card>
          ))}

          {/* Add Comment */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <Text className="font-medium text-gray-900 mb-2">Add Comment</Text>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Write your comment..."
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
                style={{ textAlignVertical: 'top' }}
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center justify-center"
              >
                <Send size={16} color="white" />
                <Text className="text-white ml-2 font-medium">
                  {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                </Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">Community</Text>
          <TouchableOpacity
            onPress={() => setShowNewPostForm(!showNewPostForm)}
            className="bg-blue-600 px-3 py-1 rounded-lg"
          >
            <Text className="text-white font-medium">New Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* New Post Form */}
        {showNewPostForm && (
          <Card className="my-4">
            <CardContent className="p-4">
              <Text className="font-semibold text-gray-900 mb-3">Create New Post</Text>
              <TextInput
                value={newPostTitle}
                onChangeText={setNewPostTitle}
                placeholder="Post title..."
                className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
              />
              <TextInput
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="What's on your mind?"
                multiline
                numberOfLines={4}
                className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
                style={{ textAlignVertical: 'top' }}
              />
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={handleCreatePost}
                  disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
                  className="flex-1 bg-blue-600 px-4 py-2 rounded-lg items-center justify-center"
                >
                  <Text className="text-white font-medium">
                    {createPostMutation.isPending ? 'Posting...' : 'Post'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowNewPostForm(false);
                    setNewPostTitle('');
                    setNewPostContent('');
                  }}
                  className="bg-gray-300 px-4 py-2 rounded-lg items-center justify-center"
                >
                  <Text className="text-gray-700 font-medium">Cancel</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Posts */}
        <View className="py-4">
          {posts.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <MessageSquare size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4">
                No community posts yet. Be the first to start a discussion!
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                onPress={() => setSelectedPost(post.id)}
                className="mb-4"
              >
                <Card>
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <View className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          <User size={16} color="#6b7280" />
                        </View>
                        <View>
                          <Text className="font-semibold text-gray-900">
                            {post.author.first_name} {post.author.last_name}
                          </Text>
                          <Text className="text-xs" style={{ color: getRoleColor(post.author.role) }}>
                            {post.author.role.charAt(0).toUpperCase() + post.author.role.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500">{formatDate(post.created_at)}</Text>
                    </View>
                    
                    {post.is_pinned && (
                      <View className="flex-row items-center mb-2">
                        <Pin size={14} color="#f59e0b" />
                        <Text className="text-amber-600 text-xs ml-1 font-medium">Pinned</Text>
                      </View>
                    )}
                    
                    <Text className="text-lg font-semibold text-gray-900 mb-2">{post.title}</Text>
                    <Text className="text-gray-700 mb-3" numberOfLines={3}>{post.content}</Text>
                    
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={() => handleLikePost(post.id, post.user_liked)}
                        className="flex-row items-center"
                      >
                        <Heart size={16} color={post.user_liked ? '#ef4444' : '#6b7280'} />
                        <Text className="text-sm text-gray-600 ml-1">{post.likes_count}</Text>
                      </TouchableOpacity>
                      
                      <View className="flex-row items-center">
                        <MessageCircle size={16} color="#6b7280" />
                        <Text className="text-sm text-gray-600 ml-1">{post.comments_count}</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ParentCommunityScreen; 