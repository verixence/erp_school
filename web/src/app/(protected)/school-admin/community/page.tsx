'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, MessageSquare, Heart, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/ui/post-card';
import { CreatePostModal } from '@/components/ui/create-post-modal';
import { useAuth } from '@/hooks/use-auth';
import { 
  usePosts, 
  subscribeToPostUpdates,
  Post 
} from '@erp/common';

export default function CommunityPage() {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'teachers' | 'parents' | 'students' | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  
  const { data: postsData, isLoading, error } = usePosts(user?.school_id || '');

  // Update local posts when data changes
  useEffect(() => {
    if (postsData) {
      setPosts(postsData);
    }
  }, [postsData]);

  // Set up real-time subscriptions
  useEffect(() => {
    const subscription = subscribeToPostUpdates((payload) => {
      console.log('Real-time update:', payload);
      
      if (payload.eventType === 'INSERT' && payload.table === 'posts') {
        console.log('New post added');
      }
      
      if (payload.eventType === 'INSERT' && payload.table === 'post_reactions') {
        console.log('New reaction added');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter posts based on search and audience
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${post.author?.first_name} ${post.author?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAudience = !selectedAudience || 
      selectedAudience === 'all' || 
      post.audience === selectedAudience || 
      post.audience === 'all';
    
    return matchesSearch && matchesAudience;
  });

  // Calculate community stats
  const stats = {
    totalPosts: posts.length,
    totalReactions: posts.reduce((sum, post) => sum + (post._count?.reactions || 0), 0),
    totalComments: posts.reduce((sum, post) => sum + (post._count?.comments || 0), 0),
    activeMembers: new Set(posts.map(post => post.author_id)).size,
  };

  const audienceFilters = [
    { label: 'All', value: null },
    { label: 'Teachers', value: 'teachers' as const },
    { label: 'Parents', value: 'parents' as const },
    { label: 'Students', value: 'students' as const },
  ];

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Community</h2>
          <p className="text-gray-600">Failed to load community posts. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Community Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay connected with your school community
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 lg:mt-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/20 backdrop-blur-md rounded-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPosts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/20 backdrop-blur-md rounded-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReactions}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/20 backdrop-blur-md rounded-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalComments}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/20 backdrop-blur-md rounded-lg p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeMembers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 border border-white/20 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search posts, authors, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 border-white/30"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <div className="flex flex-wrap gap-2">
                {audienceFilters.map((filter) => (
                  <Button
                    key={filter.label}
                    onClick={() => setSelectedAudience(filter.value)}
                    variant={selectedAudience === filter.value ? "default" : "outline"}
                    size="sm"
                    className={
                      selectedAudience === filter.value
                        ? "bg-blue-500 text-white"
                        : "bg-white/50 hover:bg-white/70"
                    }
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {(searchQuery || selectedAudience) && (
            <div className="flex items-center space-x-2 mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredPosts.length} of {posts.length} posts
              </span>
              {selectedAudience && (
                <Badge variant="secondary">
                  {audienceFilters.find(f => f.value === selectedAudience)?.label}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary">
                  "{searchQuery}"
                </Badge>
              )}
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAudience(null);
                }}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Posts Grid - Masonry Layout */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white/20 backdrop-blur-md rounded-lg h-64 border border-white/20"
              />
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            <AnimatePresence>
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="break-inside-avoid mb-6"
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || selectedAudience ? 'No posts found' : 'No posts yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || selectedAudience 
                ? 'Try adjusting your search or filters' 
                : 'Be the first to share something with the community!'
              }
            </p>
            {!(searchQuery || selectedAudience) && (
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
} 