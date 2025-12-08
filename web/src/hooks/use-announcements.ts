'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { CommunityAnnouncement, CreateAnnouncementData } from '@erp/common';

// Fetch all announcements from API route (for school admin)
export function useAllAnnouncements(schoolId: string) {
  return useQuery({
    queryKey: ['all-announcements', schoolId],
    queryFn: async () => {
      const response = await fetch('/api/announcements');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch announcements');
      }

      const data = await response.json();
      return data.announcements as CommunityAnnouncement[];
    },
    enabled: !!schoolId,
    staleTime: 30000, // 30 seconds
  });
}

// Fetch filtered announcements (for teachers/parents viewing)
export function useCommunityAnnouncements(schoolId: string, audience?: string) {
  return useQuery({
    queryKey: ['community-announcements', schoolId, audience],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (audience && audience !== 'all') {
        params.append('audience', audience);
      }

      const url = `/api/announcements${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch announcements');
      }

      const data = await response.json();
      // Filter for published announcements only
      const published = data.announcements.filter((a: CommunityAnnouncement) => a.is_published);
      return published as CommunityAnnouncement[];
    },
    enabled: !!schoolId,
    staleTime: 30000, // 30 seconds
  });
}

// Hook for creating announcements (for teachers)
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAnnouncementData & { school_id: string }) => {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          target_audience: data.target_audience,
          priority: data.priority,
          is_published: data.is_published ?? false,
          media: data.media,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create announcement');
      }

      const result = await response.json();
      return result.announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['community-announcements'] });
    },
  });
}

// Create a new announcement via API route
export async function createAnnouncement(
  schoolId: string,
  announcementData: CreateAnnouncementData
): Promise<CommunityAnnouncement> {
  const response = await fetch('/api/announcements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(announcementData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create announcement');
  }

  const result = await response.json();
  return result.announcement;
}

// Update an announcement via API route
export async function updateAnnouncement(
  announcementId: string,
  updates: Partial<CreateAnnouncementData>
): Promise<CommunityAnnouncement> {
  const response = await fetch(`/api/announcements/${announcementId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update announcement');
  }

  const data = await response.json();
  return data.announcement;
}

// Delete an announcement via API route
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const response = await fetch(`/api/announcements/${announcementId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete announcement');
  }
}
