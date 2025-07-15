'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePosts } from '@erp/common';
import { MessageSquare, Heart, Search, Users, Calendar, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PostCard from '@/components/PostCard';

export default function ParentCommunityPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'teachers' | 'parents'>('all');
  
  const { data: posts = [], isLoading, refetch } = usePosts(user?.school_id || '', selectedAudience);

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => 
    !searchQuery || 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${post.author?.first_name} ${post.author?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Community</h1>
          <p className="text-gray-600 mt-2">
            Stay connected with school updates and discussions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-500">{posts.length} posts</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {(['all', 'teachers', 'parents'] as const).map((audience) => (
            <Button
              key={audience}
              variant={selectedAudience === audience ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAudience(audience)}
              className="capitalize"
            >
              {audience}
            </Button>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchQuery ? 'No posts found' : 'No posts available'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try adjusting your search terms or filters.'
                  : 'Community posts will appear here when available.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              onPostUpdated={refetch}
              onPostDeleted={refetch}
              showComments={true}
              allowInteractions={true}
              allowEditing={false}
            />
          ))
        )}
      </div>

      {/* Note for parents */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-blue-800">
            <MessageSquare className="w-5 h-5" />
            <p className="text-sm">
              <strong>Note:</strong> You can react to posts and add comments. Only school administrators and teachers can create new posts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 