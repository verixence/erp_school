'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  File, 
  X, 
  Plus,
  AlertCircle 
} from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface MediaUploadProps {
  onMediaChange: (urls: string[]) => void;
  existingMedia?: string[];
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
}

interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
}

export function MediaUpload({ 
  onMediaChange, 
  existingMedia = [], 
  maxFiles = 5,
  accept = "image/*,video/*,.pdf,.doc,.docx",
  disabled = false 
}: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(
    existingMedia.map(url => ({
      url,
      type: getMediaType(url),
      name: url.split('/').pop() || 'Unknown'
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getMediaType = (url: string): 'image' | 'video' | 'document' => {
    const ext = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return 'image';
    } else if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(ext || '')) {
      return 'video';
    } else {
      return 'document';
    }
  };

  const handleFileSelect = async (files: FileList) => {
    if (disabled || mediaFiles.length + files.length > maxFiles) {
      return;
    }

    setIsUploading(true);
    const newFiles: MediaFile[] = [];

    // In a real implementation, you would upload files to storage
    // For now, we'll create blob URLs for preview
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const type = getMediaType(file.name);
      
      newFiles.push({
        url,
        type,
        name: file.name
      });
    }

    const updatedFiles = [...mediaFiles, ...newFiles];
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles.map(f => f.url));
    setIsUploading(false);
  };

  const removeMedia = (indexToRemove: number) => {
    const updatedFiles = mediaFiles.filter((_, index) => index !== indexToRemove);
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles.map(f => f.url));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const MediaPreview = ({ media, index }: { media: MediaFile; index: number }) => {
    const getIcon = () => {
      switch (media.type) {
        case 'image':
          return <ImageIcon className="w-6 h-6" />;
        case 'video':
          return <Video className="w-6 h-6" />;
        default:
          return <File className="w-6 h-6" />;
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative group"
      >
        <Card className="relative overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-colors">
          {media.type === 'image' ? (
            <img
              src={media.url}
              alt={media.name}
              className="w-full h-24 object-cover"
            />
          ) : (
            <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                {getIcon()}
                <p className="text-xs text-gray-600 mt-1 truncate max-w-20">
                  {media.name}
                </p>
              </div>
            </div>
          )}
          
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeMedia(index)}
              className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!disabled && mediaFiles.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <div className="space-y-2">
            <div className="flex justify-center">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                Images, videos, or documents (max {maxFiles - mediaFiles.length} more)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Media Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <AnimatePresence>
            {mediaFiles.map((media, index) => (
              <MediaPreview key={media.url} media={media} index={index} />
            ))}
          </AnimatePresence>
          
          {/* Add More Button */}
          {!disabled && mediaFiles.length < maxFiles && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card 
                className="border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors h-24 flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-6 h-6 text-gray-400" />
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* File Limit Warning */}
      {mediaFiles.length >= maxFiles && (
        <div className="flex items-center space-x-2 text-amber-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Maximum {maxFiles} files allowed</span>
        </div>
      )}
    </div>
  );
} 