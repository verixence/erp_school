'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommunityPost, CreatePostData, PostComment } from '@erp/common';

// Fetch posts from API route
export function usePosts(schoolId: string, audience?: string) {
  return useQuery({
    queryKey: ['posts', schoolId, audience],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (audience && audience !== 'all') {
        params.append('audience', audience);
      }

      const url = `/api/community/posts${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch posts');
      }

      const data = await response.json();
      return data.posts as CommunityPost[];
    },
    enabled: !!schoolId,
    staleTime: 30000, // 30 seconds
  });
}

// Create a new post via API route
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostData & { schoolId: string }) => {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          audience: data.audience,
          media: data.media,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      const result = await response.json();
      return result.post as CommunityPost;
    },
    onSuccess: () => {
      // Invalidate posts query to refetch
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// Update post
export async function updatePost(postId: string, updates: Partial<CreatePostData>): Promise<CommunityPost> {
  const response = await fetch(`/api/community/posts/${postId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update post');
  }

  const data = await response.json();
  return data.post;
}

// Delete post
export async function deletePost(postId: string): Promise<void> {
  const response = await fetch(`/api/community/posts/${postId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete post');
  }
}

// Toggle reaction on a post
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { post_id: string; emoji: string }) => {
      const response = await fetch(`/api/community/posts/${data.post_id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji: data.emoji }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle reaction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// Fetch comments for a post
export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const response = await fetch(`/api/community/posts/${postId}/comments`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch comments');
      }

      const data = await response.json();
      return data.comments as PostComment[];
    },
    enabled: !!postId,
  });
}

// Create a comment on a post
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { post_id: string; body: string }) => {
      const response = await fetch(`/api/community/posts/${data.post_id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: data.body }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create comment');
      }

      const result = await response.json();
      return result.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
    },
  });
}

// Export uploadMedia from common package for compatibility
export { uploadMedia } from '@erp/common';
