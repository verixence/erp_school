'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Play,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Card, CardContent } from './card';
import { Textarea } from './textarea';
import { toast } from 'sonner';
import { 
  Post, 
  PostReaction, 
  PostComment, 
  MediaObject,
  useToggleReaction,
  useCreateComment,
  usePostComments
} from '@erp/common';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  className?: string;
}

const popularEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function PostCard({ post, className }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const toggleReaction = useToggleReaction();
  const createComment = useCreateComment();
  const { data: comments } = usePostComments(post.id);

  // Enhanced media handling - support both media array and media_urls
  const mediaItems: MediaObject[] = post.media || 
    (post.media_urls || []).map((url, index) => ({
      url,
      type: getMediaTypeFromUrl(url),
      name: `media-${index + 1}`,
      size: 0
    }));
  
  const hasMedia = mediaItems.length > 0;
  const currentMedia = mediaItems[mediaIndex];

  // Get media type from URL
  function getMediaTypeFromUrl(url: string): 'image' | 'video' | 'document' {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '')) return 'video';
    return 'document';
  }

  const handleReaction = async (emoji: string = '👍') => {
    if (!user) {
      toast.error('Please log in to react to posts');
      return;
    }

    try {
      await toggleReaction.mutateAsync({
        post_id: post.id,
        emoji
      });
      setShowReactionPicker(false);
      toast.success(`Reacted with ${emoji}`);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    try {
      await createComment.mutateAsync({
        post_id: post.id,
        body: newComment.trim()
      });
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const nextMedia = () => {
    setMediaIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    setMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const playVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const getUserReaction = () => {
    if (!user) return null;
    return post.reactions?.find(r => r.user_id === user.id)?.emoji;
  };

  const getReactionCounts = () => {
    const counts: { [emoji: string]: number } = {};
    post.reactions?.forEach(reaction => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });
    return counts;
  };

  const reactionCounts = getReactionCounts();
  const userReaction = getUserReaction();
  const totalReactions = post._count?.reactions || post.reactions?.length || 0;
  const totalComments = post._count?.comments || post.comments?.length || comments?.length || 0;

  const getAudienceBadgeColor = (audience: string) => {
    switch (audience) {
      case 'teachers': return 'bg-blue-100 text-blue-800';
      case 'parents': return 'bg-green-100 text-green-800';
      case 'students': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Instagram-like Media Component
  const MediaCarousel = () => {
    if (!hasMedia) return null;

    return (
      <div className="relative w-full bg-black rounded-lg overflow-hidden">
        <div className="relative w-full" style={{ maxHeight: '400px' }}>
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.name || 'Post media'}
              className="w-full h-full object-cover cursor-pointer"
              style={{ 
                aspectRatio: 'auto',
                maxHeight: '400px',
                minHeight: '200px'
              }}
              onClick={() => setShowFullImage(true)}
            />
          ) : currentMedia.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentMedia.url}
              className="w-full h-full object-cover cursor-pointer"
              style={{ 
                maxHeight: '400px',
                minHeight: '200px'
              }}
              controls
              onClick={playVideo}
              poster={currentMedia.url.replace(/\.[^/.]+$/, '.jpg')}
            />
          ) : (
            <div className="w-full flex items-center justify-center bg-gray-100" style={{ height: '200px' }}>
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">{currentMedia.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open(currentMedia.url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Navigation arrows for multiple media */}
          {mediaItems.length > 1 && (
            <>
              <Button
                onClick={prevMedia}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border-0"
                size="sm"
                variant="ghost"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </Button>
              <Button
                onClick={nextMedia}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border-0"
                size="sm"
                variant="ghost"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </Button>
            </>
          )}
        </div>

        {/* Media indicators (dots) */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {mediaItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setMediaIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === mediaIndex ? 'bg-white scale-110' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Media count indicator */}
        {mediaItems.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {mediaIndex + 1}/{mediaItems.length}
          </div>
        )}
      </div>
    );
  };

  // Full screen media modal
  const MediaModal = () => {
    if (!showFullImage || !hasMedia) return null;

    const currentMedia = mediaItems[mediaIndex];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
        onClick={() => setShowFullImage(false)}
      >
        <Button
          onClick={() => setShowFullImage(false)}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
          size="sm"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center p-4">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.name || 'Post media'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : currentMedia.type === 'video' ? (
            <video
              src={currentMedia.url}
              className="max-w-full max-h-full object-contain"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}

          {/* Navigation in modal */}
          {mediaItems.length > 1 && (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  prevMedia();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-0"
                size="sm"
                variant="ghost"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  nextMedia();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-0"
                size="sm"
                variant="ghost"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Card className={`mb-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-0">
          {/* Post Header */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/api/placeholder/40/40" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                    {post.author?.first_name?.[0] || post.author?.role?.[0]?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {post.author?.display_name 
                      ? post.author.display_name
                      : post.author?.first_name && post.author?.last_name 
                        ? `${post.author.first_name} ${post.author.last_name}`
                        : post.author?.role === 'school_admin' 
                          ? 'School Admin'
                          : post.author?.role === 'teacher'
                            ? 'Teacher'
                            : 'Unknown User'
                    }
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    <span>•</span>
                    <Badge className={getAudienceBadgeColor(post.audience)} variant="secondary">
                      {post.audience}
                    </Badge>
                    {post.author?.role && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {post.author.role === 'school_admin' ? 'Admin' : 
                           post.author.role === 'teacher' ? 'Teacher' : 
                           post.author.role}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Post Title and Content */}
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {post.title}
              </h3>
              {post.body && (
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {post.body}
                </p>
              )}
            </div>
          </div>

          {/* Media Carousel */}
          <MediaCarousel />

          {/* Engagement Bar */}
          <div className="p-4">
            {/* Reactions Summary */}
            {totalReactions > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-1">
                  {Object.entries(reactionCounts).map(([emoji, count]) => (
                    <div
                      key={emoji}
                      className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 text-sm"
                    >
                      <span>{emoji}</span>
                      <span className="text-gray-600 dark:text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
                {totalComments > 0 && (
                  <span 
                    className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:underline"
                    onClick={() => setShowComments(!showComments)}
                  >
                    {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className={`flex items-center space-x-2 ${
                      userReaction ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${userReaction ? 'fill-current' : ''}`} />
                    <span>{userReaction || 'Like'}</span>
                  </Button>
                  
                  <AnimatePresence>
                    {showReactionPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 flex space-x-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-10"
                      >
                        {popularEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center space-x-2 text-gray-500"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Comment</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 text-gray-500"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Comment Input */}
                  <div className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[60px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleComment();
                          }
                        }}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleComment}
                          disabled={!newComment.trim() || createComment.isPending}
                          size="sm"
                        >
                          {createComment.isPending ? 'Posting...' : 'Post'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments?.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/api/placeholder/32/32" />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs">
                            {comment.user?.first_name?.[0]}{comment.user?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                {comment.user?.first_name} {comment.user?.last_name}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              {comment.body}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                            <button className="hover:text-gray-700 dark:hover:text-gray-300">Like</button>
                            <button className="hover:text-gray-700 dark:hover:text-gray-300">Reply</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showFullImage && <MediaModal />}
      </AnimatePresence>
    </>
  );
}