import { supabase } from '../services/supabase';

export interface MediaObject {
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  size?: number;
}

export interface ImagePickerResult {
  uri: string;
  type?: string;
  name?: string;
  size?: number;
}

// Convert React Native image picker result to ArrayBuffer for upload
const createArrayBufferFromUri = async (uri: string): Promise<ArrayBuffer> => {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
};

// Upload media files to Supabase storage
export const uploadMediaFromRN = async (
  imageResults: ImagePickerResult[], 
  schoolId: string
): Promise<MediaObject[]> => {
  const mediaObjects: MediaObject[] = [];

  for (const result of imageResults) {
    try {
      // Generate unique filename
      const fileExt = result.name?.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `posts/${schoolId}/${fileName}`;

      // Convert URI to ArrayBuffer
      const arrayBuffer = await createArrayBufferFromUri(result.uri);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: result.type || 'image/jpeg'
        });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const mediaType = (result.type?.startsWith('image/') || !result.type) ? 'image' : 
                       result.type?.startsWith('video/') ? 'video' : 'document';

      mediaObjects.push({
        url: publicData.publicUrl,
        type: mediaType,
        name: result.name || fileName,
        size: result.size
      });
    } catch (uploadError) {
      console.error('Error processing image upload:', uploadError);
      continue;
    }
  }

  return mediaObjects;
};

// Get media type from URL
export const getMediaType = (url: string): 'image' | 'video' | 'document' => {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return 'image';
  }
  
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) {
    return 'video';
  }
  
  return 'document';
};

// Format file size for display
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};