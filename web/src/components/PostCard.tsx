'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Heart, 
  Edit, 
  Trash2, 
  Send, 
  X,
  MoreHorizontal,
  Image as ImageIcon,
  ZoomIn
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useToggleReaction, useCreateComment, usePostComments, updatePost, deletePost, uploadMedia } from '@/hooks/use-community';
import type { CommunityPost } from '@erp/common';

interface PostCardProps {
  post: CommunityPost;
  user: any;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
  showComments?: boolean;
  allowInteractions?: boolean;
  allowEditing?: boolean;
}

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const ImageViewer = ({ images, currentIndex, onClose, onNext, onPrevious }: ImageViewerProps) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-black/20 hover:bg-black/40 text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 text-white"
              onClick={onPrevious}
            >
              ←
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 text-white"
              onClick={onNext}
            >
              →
            </Button>
          </>
        )}
        
        <img
          src={images[currentIndex]}
          alt={`Post image ${currentIndex + 1}`}
          className="w-full max-h-[85vh] object-contain"
        />
        
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default function PostCard({
  post,
  user,
  onPostUpdated,
  onPostDeleted,
  showComments = true,
  allowInteractions = true,
  allowEditing = true,
}: PostCardProps) {
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editAudience, setEditAudience] = useState(post.audience);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleReaction = useToggleReaction();
  const createComment = useCreateComment();
  const { data: comments = [] } = usePostComments(post.id);

  const canEdit = allowEditing && (post.author_id === user?.id || user?.role === 'school_admin');
  const userReaction = post.reactions?.find(r => r.user_id === user?.id);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAudienceBadge = (audience: string) => {
    const colors = {
      all: 'bg-blue-100 text-blue-800',
      teachers: 'bg-green-100 text-green-800',
      parents: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <Badge className={colors[audience as keyof typeof colors] || colors.all}>
        {audience.charAt(0).toUpperCase() + audience.slice(1)}
      </Badge>
    );
  };

  const handleReaction = async (emoji: string) => {
    if (!allowInteractions) return;
    
    try {
      await toggleReaction.mutateAsync({
        post_id: post.id,
        emoji,
      });
    } catch (error) {
      toast.error('Failed to react to post');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !allowInteractions) return;

    try {
      await createComment.mutateAsync({
        post_id: post.id,
        body: newComment.trim(),
      });
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEditFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrls = post.media_urls || [];
      
      if (editFiles.length > 0) {
        const uploadedMedia = await uploadMedia(editFiles, user?.school_id || '');
        mediaUrls = [...mediaUrls, ...uploadedMedia.map(m => m.url)];
      }

      await updatePost(post.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        audience: editAudience,
        media: mediaUrls.map(url => ({ url, type: 'image' as const, name: 'image' }))
      });

      toast.success('Post updated successfully');
      setIsEditing(false);
      setEditFiles([]);
      onPostUpdated?.();
    } catch (error) {
      toast.error('Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deletePost(post.id);
      toast.success('Post deleted successfully');
      onPostDeleted?.();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === (post.media_urls?.length || 0) - 1 ? 0 : prev + 1
    );
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? (post.media_urls?.length || 0) - 1 : prev - 1
    );
  };

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200 bg-white border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-gray-100">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                  {getInitials(post.author?.first_name || '', post.author?.last_name || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">
                  {post.author?.first_name} {post.author?.last_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {post.author?.role?.replace('_', ' ') || 'User'}
                  </Badge>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getAudienceBadge(post.audience)}
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {post.title}
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {post.body}
            </p>
          </div>

          {/* Enhanced Media Display */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="space-y-2">
              {post.media_urls.length === 1 ? (
                <div className="relative group cursor-pointer" onClick={() => openImageViewer(0)}>
                  <img
                    src={post.media_urls[0]}
                    alt="Post media"
                    className="w-full max-h-96 object-cover rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
              ) : (
                <div className={`grid gap-2 ${post.media_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {post.media_urls.slice(0, 4).map((url, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer"
                      onClick={() => openImageViewer(index)}
                    >
                      <img
                        src={url}
                        alt={`Post media ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                      {index === 3 && post.media_urls.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            +{post.media_urls.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interaction Section */}
          {allowInteractions && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {/* Engagement Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span>{post._count?.reactions || 0} reactions</span>
                <span>{post._count?.comments || 0} comments</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction('❤️')}
                  className={`flex items-center gap-2 ${
                    userReaction?.emoji === '❤️' 
                      ? 'text-red-500 bg-red-50' 
                      : 'text-gray-600 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${userReaction?.emoji === '❤️' ? 'fill-current' : ''}`} />
                  <span>Like</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Comment</span>
                </Button>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="space-y-3">
                  {displayedComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-xs">
                          {getInitials(comment.user?.first_name || '', comment.user?.last_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900">
                            {comment.user?.first_name} {comment.user?.last_name}
                          </span>
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1 text-sm">{comment.body}</p>
                      </div>
                    </div>
                  ))}

                  {comments.length > 3 && !showAllComments && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllComments(true)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Show {comments.length - 3} more comments
                    </Button>
                  )}

                  {/* Add Comment Form */}
                  <form onSubmit={handleComment} className="flex gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-xs">
                        {getInitials(user?.first_name || '', user?.last_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="min-h-[40px] resize-none"
                        rows={1}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newComment.trim() || createComment.isPending}
                        className="self-end"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {showImageViewer && post.media_urls && (
        <ImageViewer
          images={post.media_urls}
          currentIndex={currentImageIndex}
          onClose={() => setShowImageViewer(false)}
          onNext={nextImage}
          onPrevious={previousImage}
        />
      )}

      {/* Edit Post Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter post title..."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-body">Content</Label>
              <Textarea
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Write your post content..."
                rows={4}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-audience">Audience</Label>
              <Select value={editAudience} onValueChange={(value: any) => setEditAudience(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                  <SelectItem value="parents">Parents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Media Upload */}
            <div>
              <Label htmlFor="edit-media">Add Images</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-media"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('edit-media')?.click()}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Add Images
                </Button>
              </div>
              
              {editFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {editFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Post'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 