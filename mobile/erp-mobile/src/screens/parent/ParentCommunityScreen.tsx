import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import {
  MessageSquare,
  Heart,
  Users,
  User,
  Clock,
  Globe,
  UserCheck,
  GraduationCap
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  school_id: string;
  author_id: string;
  title: string;
  body?: string;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  media_urls?: string[];
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  reactions?: Array<{
    emoji: string;
    user_id: string;
    created_at: string;
  }>;
  comments?: Array<{
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    user: {
      first_name: string;
      last_name: string;
    };
  }>;
}

const ParentCommunityScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'teachers' | 'parents' | 'students'>('all');

  // Fetch posts
  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['community-posts', user?.school_id, selectedAudience],
    queryFn: async (): Promise<Post[]> => {
      if (!user?.school_id) return [];

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_author_id_fkey(
            id,
            first_name,
            last_name,
            role,
            display_name
          ),
          reactions:post_reactions(
            emoji,
            user_id,
            created_at,
            user:users(first_name, last_name)
          ),
          comments:post_comments(
            id,
            body,
            created_at,
            user:users(first_name, last_name)
          )
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      // Filter posts visible to parents
      if (selectedAudience === 'all') {
        query = query.or('audience.eq.parents,audience.eq.all');
      } else {
        query = query.eq('audience', selectedAudience);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      // Transform the data to include proper counts
      const transformedPosts = data?.map(post => ({
        ...post,
        author: Array.isArray(post.author) ? post.author[0] : post.author,
      })) || [];

      console.log('Fetched community posts:', transformedPosts.length);
      return transformedPosts;
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
  });

  // React to post mutation
  const reactToPostMutation = useMutation({
    mutationFn: async ({ postId, emoji }: { postId: string; emoji: string }) => {
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingReaction) {
        // Remove existing reaction if same emoji, or update if different
        if (existingReaction.emoji === emoji) {
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user?.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_reactions')
            .update({ emoji })
            .eq('post_id', postId)
            .eq('user_id', user?.id);
          if (error) throw error;
        }
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user?.id,
            emoji
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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

  const handleReactToPost = (postId: string, emoji: string = '❤️') => {
    reactToPostMutation.mutate({ postId, emoji });
  };

  const getUserReaction = (post: Post): string | null => {
    const userReaction = post.reactions?.find(r => r.user_id === user?.id);
    return userReaction?.emoji || null;
  };

  const getReactionCount = (post: Post): number => {
    return post.reactions?.length || 0;
  };

  const getCommentCount = (post: Post): number => {
    return post.comments?.length || 0;
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
              backgroundColor: '#8b5cf6', 
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
                Stay connected with school updates and discussions
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Users size={16} color="#6b7280" />
            <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 4 }}>
              {posts.length} posts
            </Text>
          </View>
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
                  backgroundColor: selectedAudience === filter.key ? '#8b5cf6' : '#f3f4f6',
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
              No Posts Available
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              Community posts will appear here when shared by teachers and administrators.
            </Text>
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

                {/* Post Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    {post.media_urls.length === 1 ? (
                      <Image
                        source={{ uri: post.media_urls[0] }}
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          borderRadius: 12,
                          marginBottom: 8
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {post.media_urls.map((imageUrl: string, index: number) => (
                            <Image
                              key={index}
                              source={{ uri: imageUrl }}
                              style={{ 
                                width: 150, 
                                height: 150, 
                                borderRadius: 12,
                              }}
                              resizeMode="cover"
                            />
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Post Actions */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-around',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#f3f4f6'
                }}>
                  <TouchableOpacity 
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: getUserReaction(post) === '❤️' ? '#fef2f2' : 'transparent'
                    }}
                    onPress={() => handleReactToPost(post.id, '❤️')}
                  >
                    <Heart 
                      size={20} 
                      color={getUserReaction(post) === '❤️' ? '#ef4444' : '#6b7280'} 
                      fill={getUserReaction(post) === '❤️' ? '#ef4444' : 'none'}
                    />
                    <Text style={{ 
                      fontSize: 15, 
                      color: getUserReaction(post) === '❤️' ? '#ef4444' : '#6b7280', 
                      marginLeft: 8,
                      fontWeight: '500'
                    }}>
                      {getReactionCount(post) > 0 ? getReactionCount(post) : 'Like'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 8
                    }}
                  >
                    <MessageSquare size={20} color="#6b7280" />
                    <Text style={{ 
                      fontSize: 15, 
                      color: '#6b7280', 
                      marginLeft: 8,
                      fontWeight: '500'
                    }}>
                      {getCommentCount(post) > 0 ? getCommentCount(post) : 'Comment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
};

export { ParentCommunityScreen };
export default ParentCommunityScreen;