'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { usePosts, useCommunityAnnouncements } from '@erp/common';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/ui/post-card';
import { MessageSquare, Megaphone, Heart, ThumbsUp, Smile, Star, ArrowLeft, Home } from 'lucide-react';
import { Footer } from '@/components/ui/footer';
import Link from 'next/link';

interface AnnouncementItem {
  id: string;
  type: 'announcement';
  title: string;
  content: string;
  target_audience: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  priority?: string;
  created_at: string;
  media_urls?: string[];
}

export default function FeedPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Fetch posts for all audiences to show cross-portal content
  // This ensures posts from other portals are visible
  const { data: allPosts } = usePosts(user?.school_id || '', 'all');
  const { data: teacherPosts } = usePosts(user?.school_id || '', 'teachers');
  const { data: parentPosts } = usePosts(user?.school_id || '', 'parents');
  const { data: studentPosts } = usePosts(user?.school_id || '', 'students');
  
  // Fetch announcements for cross-portal visibility
  const { data: allAnnouncements } = useCommunityAnnouncements(user?.school_id || '', 'all');
  const { data: userAnnouncements } = useCommunityAnnouncements(user?.school_id || '', user?.role === 'teacher' ? 'teachers' : user?.role === 'parent' ? 'parents' : 'students');

  // Combine all posts from different audiences for cross-portal visibility
  const allCommunityPosts = useMemo(() => {
    const combinedPosts = [];
    
    // Add posts from all audiences
    if (allPosts) combinedPosts.push(...allPosts);
    if (teacherPosts) combinedPosts.push(...teacherPosts);
    if (parentPosts) combinedPosts.push(...parentPosts);
    if (studentPosts) combinedPosts.push(...studentPosts);
    
    // Remove duplicates based on ID
    const uniquePosts = combinedPosts.filter((post, index, arr) => 
      arr.findIndex(p => p.id === post.id) === index
    );
    
    return uniquePosts.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allPosts, teacherPosts, parentPosts, studentPosts]);

  // Transform announcements to match display format
  const announcementItems: AnnouncementItem[] = useMemo(() => {
    const combinedAnnouncements = [];
    
    if (allAnnouncements) combinedAnnouncements.push(...allAnnouncements);
    if (userAnnouncements) combinedAnnouncements.push(...userAnnouncements);
    
    // Remove duplicates and transform
    const uniqueAnnouncements = combinedAnnouncements.filter((announcement, index, arr) => 
      arr.findIndex(a => a.id === announcement.id) === index
    );
    
    return uniqueAnnouncements.map(announcement => ({
      id: announcement.id,
      type: 'announcement' as const,
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience || 'all',
      author: announcement.author,
      priority: announcement.priority,
      created_at: announcement.created_at,
      media_urls: announcement.media_urls
    })).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allAnnouncements, userAnnouncements]);

  const filteredPosts = allCommunityPosts.filter(post => {
    if (activeFilter === 'all' || activeFilter === 'post') return true;
    return false;
  });

  const filteredAnnouncements = announcementItems.filter(announcement => {
    if (activeFilter === 'all' || activeFilter === 'announcement') return true;
    return false;
  });

  const getTypeIcon = (type: string) => {
    return type === 'post' ? 
      <MessageSquare className="w-5 h-5 text-blue-600" /> : 
      <Megaphone className="w-5 h-5 text-purple-600" />;
  };

  const getAudienceBadge = (audience: string) => {
    const variants = {
      all: 'default',
      teachers: 'secondary',
      parents: 'outline',
      students: 'destructive'
    } as const;

    return (
      <Badge variant={variants[audience as keyof typeof variants] || 'default'}>
        {audience}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    
    const variants = {
      low: 'secondary',
      normal: 'default',
      high: 'destructive',
      urgent: 'destructive'
    } as const;

    const colors = {
      low: 'text-blue-600',
      normal: 'text-gray-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    } as const;

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'default'} className={colors[priority as keyof typeof colors]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Navigation Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 mb-6"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Community Feed</h1>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 pb-8"
      >
        <div className="mb-6">
          <p className="text-gray-600">Stay updated with school posts and announcements from all portals</p>
        </div>

        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
          <TabsList className="glassmorphism">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="post">Posts</TabsTrigger>
            <TabsTrigger value="announcement">Announcements</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-6">
          {/* Render Posts using PostCard component for full functionality */}
          {(activeFilter === 'all' || activeFilter === 'post') && filteredPosts.map((post, index) => (
            <motion.div
              key={`post-${post.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}

          {/* Render Announcements with media support */}
          {(activeFilter === 'all' || activeFilter === 'announcement') && filteredAnnouncements.map((item, index) => (
            <motion.div
              key={`announcement-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (filteredPosts.length + index) * 0.1 }}
            >
              <Card className="glassmorphism hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>By {item.author?.first_name} {item.author?.last_name}</span>
                          <span>•</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          {getAudienceBadge(item.target_audience)}
                          {item.priority && (
                            <>
                              <span>•</span>
                              {getPriorityBadge(item.priority)}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed">{item.content}</p>
                  
                  {/* Display announcement media if available */}
                  {item.media_urls && item.media_urls.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {item.media_urls.map((url, mediaIndex) => (
                          <div key={mediaIndex} className="relative">
                            <img
                              src={url}
                              alt={`Announcement media ${mediaIndex + 1}`}
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(url, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Simple reaction buttons for announcements */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-500 mr-2">React:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-blue-50"
                    >
                      👍
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-red-50"
                    >
                      ❤️
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-yellow-50"
                    >
                      😊
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-purple-50"
                    >
                      🎉
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Show message if no content */}
          {filteredPosts.length === 0 && filteredAnnouncements.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No content yet</h3>
              <p className="text-gray-500">Check back later for new posts and announcements!</p>
            </motion.div>
          )}
        </div>
      </motion.div>
      <Footer />
    </div>
  );
} 