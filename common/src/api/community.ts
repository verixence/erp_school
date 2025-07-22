import { supabase } from './supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Enhanced interfaces with media support
export interface MediaObject {
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  size?: number;
}

export interface CommunityPost {
  id: string;
  school_id: string;
  author_id: string;
  title: string;
  body: string;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  created_at: string;
  updated_at: string;
  media_urls: string[];
  media?: MediaObject[];
  reactions?: PostReaction[];
  comments?: PostComment[];
  _count?: {
    reactions: number;
    comments: number;
  };
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    display_name?: string;
  };
}

export interface PostReaction {
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface CommunityAnnouncement {
  id: string;
  school_id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  sections?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  published_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  media_urls?: string[];
  author?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface CreatePostData {
  title: string;
  body: string;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  media?: MediaObject[];
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published?: boolean;
  media?: MediaObject[];
}

export interface CreateReactionData {
  post_id: string;
  emoji: string;
}

export interface CreateCommentData {
  post_id: string;
  body: string;
}

// Raw API Functions (for compatibility with existing code)
export const getPosts = async (schoolId: string, audience?: string) => {
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
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (audience && audience !== 'all') {
    query = query.or(`audience.eq.${audience},audience.eq.all`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  // Transform the data to include proper counts
  const transformedPosts = data?.map(post => ({
    ...post,
    _count: {
      reactions: post.reactions?.length || 0,
      comments: post.comments?.length || 0,
    }
  })) || [];

  return transformedPosts as CommunityPost[];
};

export const getAnnouncements = async (schoolId: string, audience?: string): Promise<CommunityAnnouncement[]> => {
  let query = supabase
    .from('announcements')
    .select(`
      *,
      author:users!announcements_created_by_fkey(first_name, last_name, role)
    `)
    .eq('school_id', schoolId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (audience && audience !== 'all') {
    query = query.or(`target_audience.eq.all,target_audience.eq.${audience}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
};

export const getAllAnnouncements = async (schoolId: string): Promise<CommunityAnnouncement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      *,
      author:users!announcements_created_by_fkey(first_name, last_name, role)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createPost = async (schoolId: string, postData: CreatePostData): Promise<CommunityPost> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      school_id: schoolId,
      author_id: user.id,
      ...postData,
      media_urls: postData.media?.map(m => m.url) || []
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const createAnnouncement = async (schoolId: string, announcementData: CreateAnnouncementData): Promise<CommunityAnnouncement> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      school_id: schoolId,
      created_by: user.id,
      ...announcementData,
      media_urls: announcementData.media?.map(m => m.url) || []
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateAnnouncement = async (announcementId: string, updates: Partial<CreateAnnouncementData>): Promise<CommunityAnnouncement> => {
  const updateData: any = { ...updates };
  if (updates.media) {
    updateData.media_urls = updates.media.map(m => m.url);
    delete updateData.media;
  }

  const { data, error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', announcementId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) throw error;
};

export const updatePost = async (postId: string, updates: Partial<CreatePostData>): Promise<CommunityPost> => {
  const updateData: any = { ...updates };
  if (updates.media) {
    updateData.media_urls = updates.media.map(m => m.url);
    delete updateData.media;
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePost = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
};

// Media upload function
export const uploadMedia = async (files: File[], schoolId: string): Promise<MediaObject[]> => {
  const mediaObjects: MediaObject[] = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `posts/${schoolId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      continue;
    }

    const { data: publicData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const mediaType = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 'document';

    mediaObjects.push({
      url: publicData.publicUrl,
      type: mediaType,
      name: file.name,
      size: file.size
    });
  }

  return mediaObjects;
};

// React Query Hooks (only specialized ones, avoid conflicts with hooks.ts)
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePostData & { schoolId: string }) => {
      const { schoolId, ...postData } = data;
      return createPost(schoolId, postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<CreateAnnouncementData>) => {
      return updateAnnouncement(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateReactionData) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if reaction already exists
        const { data: existing, error: selectError } = await supabase
          .from('post_reactions')
          .select('*')
          .eq('post_id', data.post_id)
          .eq('user_id', user.id)
          .eq('emoji', data.emoji)
          .maybeSingle();

        if (selectError) {
          console.error('Error checking existing reaction:', selectError);
          throw selectError;
        }

        if (existing) {
          // Remove reaction if it exists with same emoji
          const { error: deleteError } = await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', data.post_id)
            .eq('user_id', user.id)
            .eq('emoji', data.emoji);
          
          if (deleteError) {
            console.error('Error removing reaction:', deleteError);
            throw deleteError;
          }
          
          return { action: 'removed', emoji: data.emoji };
        } else {
          // Remove any existing reaction with different emoji first
          const { error: deleteOtherError } = await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', data.post_id)
            .eq('user_id', user.id);

          if (deleteOtherError) {
            console.error('Error removing other reactions:', deleteOtherError);
            // Don't throw here, just log - we can still add the new reaction
          }

          // Add new reaction
          const { error: insertError } = await supabase
            .from('post_reactions')
            .insert({
              post_id: data.post_id,
              user_id: user.id,
              emoji: data.emoji
            });
          
          if (insertError) {
            console.error('Error adding reaction:', insertError);
            throw insertError;
          }
          
          return { action: 'added', emoji: data.emoji };
        }
      } catch (error) {
        console.error('Toggle reaction error details:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Reaction toggled successfully:', result);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCommentData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: comment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: data.post_id,
          user_id: user.id,
          body: data.body
        })
        .select(`
          *,
          user:users(first_name, last_name)
        `)
        .single();

      if (error) throw error;
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
    },
  });
};

export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:users(first_name, last_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PostComment[];
    },
    enabled: !!postId,
  });
};

// Real-time subscriptions
export const subscribeToPostUpdates = (callback: (payload: any) => void) => {
  const channel = supabase
    .channel('post-updates')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'posts' }, 
      (payload) => callback({ ...payload, table: 'posts' })
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'post_reactions' }, 
      (payload) => callback({ ...payload, table: 'post_reactions' })
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'post_comments' }, 
      (payload) => callback({ ...payload, table: 'post_comments' })
    )
    .subscribe();

  return channel;
};

// Utility functions
export function getMediaType(url: string): 'image' | 'video' | 'document' {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return 'image';
  }
  
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) {
    return 'video';
  }
  
  return 'document';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create alias for compatibility with PostCard component
export type Post = CommunityPost; 