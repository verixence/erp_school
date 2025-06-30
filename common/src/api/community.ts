import { createSupabaseClient } from './supabase';
import type { Database } from './database.types';

export type Post = {
  id: string;
  school_id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  media_urls?: string[];
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
};

export type CommunityAnnouncement = {
  id: string;
  school_id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  sections: string[] | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  published_at: string | null;
  created_by: string;
  media_urls?: string[];
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
};

export type CreatePostData = {
  title: string;
  body: string;
  audience: 'all' | 'teachers' | 'parents' | 'students';
  media_urls?: string[];
};

export type CreateAnnouncementData = {
  title: string;
  content: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  sections?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_published?: boolean;
  media_urls?: string[];
};

// Posts API
export async function getPosts(schoolId: string, audience?: string): Promise<Post[]> {
  const supabase = createSupabaseClient();
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(first_name, last_name, role)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
    
  if (audience && audience !== 'all') {
    query = query.in('audience', [audience, 'all']);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
  
  return data || [];
}

export async function createPost(schoolId: string, postData: CreatePostData): Promise<Post | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('posts')
    .insert({
      school_id: schoolId,
      author_id: (await supabase.auth.getUser()).data.user?.id,
      ...postData
    })
    .select(`
      *,
      author:users!posts_author_id_fkey(first_name, last_name, role)
    `)
    .single();
    
  if (error) {
    console.error('Error creating post:', error);
    return null;
  }
  
  return data;
}

export async function updatePost(postId: string, updates: Partial<CreatePostData>): Promise<Post | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .select(`
      *,
      author:users!posts_author_id_fkey(first_name, last_name, role)
    `)
    .single();
    
  if (error) {
    console.error('Error updating post:', error);
    return null;
  }
  
  return data;
}

export async function deletePost(postId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
    
  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }
  
  return true;
}

// Announcements API
export async function getAnnouncements(schoolId: string, audience?: string): Promise<CommunityAnnouncement[]> {
  const supabase = createSupabaseClient();
  
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
    query = query.in('target_audience', [audience, 'all']);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
  
  return data || [];
}

export async function getAllAnnouncements(schoolId: string): Promise<CommunityAnnouncement[]> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      *,
      author:users!announcements_created_by_fkey(first_name, last_name, role)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching all announcements:', error);
    return [];
  }
  
  return data || [];
}

export async function createAnnouncement(schoolId: string, announcementData: CreateAnnouncementData): Promise<CommunityAnnouncement | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      school_id: schoolId,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      priority: 'normal',
      ...announcementData
    })
    .select(`
      *,
      author:users!announcements_created_by_fkey(first_name, last_name, role)
    `)
    .single();
    
  if (error) {
    console.error('Error creating announcement:', error);
    return null;
  }
  
  return data;
}

export async function updateAnnouncement(announcementId: string, updates: Partial<CreateAnnouncementData>): Promise<CommunityAnnouncement | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', announcementId)
    .select(`
      *,
      author:users!announcements_created_by_fkey(first_name, last_name, role)
    `)
    .single();
    
  if (error) {
    console.error('Error updating announcement:', error);
    return null;
  }
  
  return data;
}

export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);
    
  if (error) {
    console.error('Error deleting announcement:', error);
    return false;
  }
  
  return true;
}

// Media Upload API
export async function uploadMedia(files: File[], folder: string = 'community'): Promise<string[]> {
  const supabase = createSupabaseClient();
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      console.error('Error uploading file:', error);
      continue;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);
      
    uploadedUrls.push(publicUrl);
  }
  
  return uploadedUrls;
}

export async function deleteMedia(urls: string[]): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  try {
    for (const url of urls) {
      // Extract file path from URL
      const urlParts = url.split('/');
      const bucket = urlParts[urlParts.length - 3];
      const folder = urlParts[urlParts.length - 2];
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${folder}/${fileName}`;
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);
        
      if (error) {
        console.error('Error deleting file:', error);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting media files:', error);
    return false;
  }
}

export function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return 'image';
  } else if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(ext || '')) {
    return 'video';
  } else {
    return 'document';
  }
} 