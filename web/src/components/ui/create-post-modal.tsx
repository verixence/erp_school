'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Image, Video, FileText } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { MediaUpload } from './media-upload';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from './dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { useCreatePost, uploadMedia } from '@/hooks/use-community';
import type { CreatePostData, MediaObject } from '@erp/common';
import { useAuth } from '@/hooks/use-auth';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreatePostData>({
    title: '',
    body: '',
    audience: 'all',
    media: [],
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const createPost = useCreatePost();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple alert for now - can be replaced with proper toast system
    alert(`${type.toUpperCase()}: ${message}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showToast('Please enter a title for your post', 'error');
      return;
    }

    if (!user?.school_id) {
      showToast('Unable to determine school. Please try again.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      
      let mediaObjects: MediaObject[] = [];
      
      // Upload files if any
      if (selectedFiles.length > 0) {
        mediaObjects = await uploadMedia(selectedFiles, user.school_id);
      }

      const postData = {
        ...formData,
        media: mediaObjects,
        schoolId: user.school_id,
      };

      await createPost.mutateAsync(postData);
      
      showToast('Post created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        body: '',
        audience: 'all',
        media: [],
      });
      setSelectedFiles([]);
      onClose();
      
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Failed to create post. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Convert file URLs from MediaUpload back to files for upload
  const handleMediaChange = (urls: string[]) => {
    // Since MediaUpload creates blob URLs, we need to extract the files
    // This is a simplified approach - in production you'd handle this differently
  };

  // Handle file selection directly (alternative approach)
  const handleFileSelection = (files: File[]) => {
    setSelectedFiles(files);
    console.log('Selected files:', files);
  };

  const audienceOptions = [
    { value: 'all', label: 'Everyone', description: 'All teachers, parents, and students' },
    { value: 'teachers', label: 'Teachers Only', description: 'Only school staff will see this' },
    { value: 'parents', label: 'Parents Only', description: 'Only parents will see this' },
    { value: 'students', label: 'Students Only', description: 'Only students will see this' },
  ];

  const getAudienceBadgeColor = (audience: string) => {
    switch (audience) {
      case 'teachers': return 'bg-blue-100 text-blue-800';
      case 'parents': return 'bg-green-100 text-green-800';
      case 'students': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Post
          </DialogTitle>
          <DialogDescription>
            Share updates, announcements, or engaging content with your school community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Post Title *
            </Label>
            <Input
              id="title"
              placeholder="Enter an engaging title for your post..."
              value={formData.title}
              onChange={(e) => setFormData((prev: CreatePostData) => ({ ...prev, title: e.target.value }))}
              className="text-lg"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="body" className="text-sm font-medium">
              Content
            </Label>
            <Textarea
              id="body"
              placeholder="Share your thoughts, updates, or announcements..."
              value={formData.body}
              onChange={(e) => setFormData((prev: CreatePostData) => ({ ...prev, body: e.target.value }))}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Audience Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Audience *
            </Label>
            <Select
              value={formData.audience}
              onValueChange={(value: 'all' | 'teachers' | 'parents' | 'students') =>
                setFormData((prev: CreatePostData) => ({ ...prev, audience: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audienceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">{option.label}</span>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Selected Audience Badge */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Posting to:</span>
              <Badge className={getAudienceBadgeColor(formData.audience)}>
                {audienceOptions.find(opt => opt.value === formData.audience)?.label}
              </Badge>
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Attachments (Optional)
            </Label>
            
            {/* Simple file input for now */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileSelection(Array.from(e.target.files));
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Click to upload files
                    </p>
                    <p className="text-xs text-gray-500">
                      Images, videos, or documents (Max 5 files, 10MB each)
                    </p>
                  </div>
                </div>
              </label>
            </div>
            
            {/* Show selected files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Selected files:</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center space-x-2">
                        {file.type.startsWith('image/') ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : file.type.startsWith('video/') ? (
                          <Video className="w-4 h-4 text-green-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-sm text-gray-700 truncate max-w-32">
                          {file.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFiles(files => files.filter((_, i) => i !== index));
                        }}
                        className="w-6 h-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {(formData.title || formData.body || selectedFiles.length > 0) && (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-gray-600 mb-2 block">
                  Preview
                </Label>
                <div className="space-y-2">
                  {formData.title && (
                    <h3 className="font-semibold text-gray-900">{formData.title}</h3>
                  )}
                  {formData.body && (
                    <p className="text-gray-700 text-sm">{formData.body}</p>
                  )}
                  {selectedFiles.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        {selectedFiles.some(f => f.type.startsWith('image/')) && <Image className="h-4 w-4" />}
                        {selectedFiles.some(f => f.type.startsWith('video/')) && <Video className="h-4 w-4" />}
                        {selectedFiles.some(f => f.type.startsWith('application/')) && <FileText className="h-4 w-4" />}
                      </div>
                      <span>{selectedFiles.length} file(s) attached</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading || createPost.isPending}
              className="btn-outline-visible"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim() || isUploading || createPost.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 btn-primary-visible"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : createPost.isPending ? (
                'Creating...'
              ) : (
                'Create Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 