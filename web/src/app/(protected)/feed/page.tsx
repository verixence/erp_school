'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { usePosts, useCommunityAnnouncements } from '@erp/common';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Megaphone, Heart, ThumbsUp, Smile, Star } from 'lucide-react';
import { Footer } from '@/components/ui/footer';

interface FeedItem {
  id: string;
  type: 'post' | 'announcement';
  title: string;
  content: string;
  audience: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  priority?: string;
  created_at: string;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Determine user's audience type for filtering
  const userAudience = user?.role === 'teacher' ? 'teachers' : 
                      user?.role === 'parent' ? 'parents' : 'students';
  
  const { data: posts } = usePosts(user?.school_id || '', userAudience);
  const { data: announcements } = useCommunityAnnouncements(user?.school_id || '', userAudience);

  // Combine and sort posts and announcements
  const feedItems: FeedItem[] = useMemo(() => {
    const combinedItems: FeedItem[] = [];
    
    // Add posts
    posts?.forEach(post => {
      combinedItems.push({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.body || '',
        audience: post.audience,
        author: post.author,
        created_at: post.created_at
      });
    });
    
    // Add announcements
    announcements?.forEach(announcement => {
      combinedItems.push({
        id: announcement.id,
        type: 'announcement',
        title: announcement.title,
        content: announcement.content,
        audience: announcement.target_audience,
        author: announcement.author,
        priority: announcement.priority,
        created_at: announcement.created_at
      });
    });
    
    // Sort by creation date (newest first)
    return combinedItems.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [posts, announcements]);

  const filteredItems = feedItems.filter(item => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
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

  const handleReaction = (itemId: string, emoji: string) => {
    // TODO: Implement reaction functionality
    console.log(`Reacted with ${emoji} to item ${itemId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <MessageSquare className="h-8 w-8 text-green-600" />
            Community Feed
          </h1>
          <p className="text-gray-600">Stay updated with school posts and announcements</p>
        </div>

        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
          <TabsList className="glassmorphism">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="post">Posts</TabsTrigger>
            <TabsTrigger value="announcement">Announcements</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
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
                          {getAudienceBadge(item.audience)}
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
                  
                  {/* Emoji Reaction Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-500 mr-2">React:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReaction(item.id, '👍')}
                      className="hover:bg-blue-50"
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      👍
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReaction(item.id, '❤️')}
                      className="hover:bg-red-50"
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      ❤️
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReaction(item.id, '😊')}
                      className="hover:bg-yellow-50"
                    >
                      <Smile className="w-4 h-4 mr-1" />
                      😊
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReaction(item.id, '⭐')}
                      className="hover:bg-orange-50"
                    >
                      <Star className="w-4 h-4 mr-1" />
                      ⭐
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="flex justify-center mb-4">
                <MessageSquare className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in feed</h3>
              <p className="text-gray-500">
                {activeFilter === 'all' 
                  ? 'There are no posts or announcements to show yet.'
                  : `There are no ${activeFilter}s to show yet.`
                }
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
      
      <Footer />
    </div>
  );
} 