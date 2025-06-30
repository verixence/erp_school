'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { usePosts, createPost, deletePost, updatePost } from '@erp/common';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import { Footer } from '@/components/ui/footer';

export default function CommunityPage() {
  const { user } = useAuth();
  const { data: posts, refetch } = usePosts(user?.school_id || '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'all'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;

    const newPost = await createPost(user.school_id, {
      ...formData,
      audience: formData.audience as 'all' | 'teachers' | 'parents' | 'students'
    });
    if (newPost) {
      setFormData({ title: '', body: '', audience: 'all' });
      setIsCreateOpen(false);
      refetch();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    const updated = await updatePost(editingPost.id, {
      ...formData,
      audience: formData.audience as 'all' | 'teachers' | 'parents' | 'students'
    });
    if (updated) {
      setEditingPost(null);
      refetch();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      const success = await deletePost(postId);
      if (success) {
        refetch();
      }
    }
  };

  const openEditDialog = (post: any) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      body: post.body || '',
      audience: post.audience
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              Community Posts
            </h1>
            <p className="text-gray-600 mt-2">Create and manage community discussions</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="glassmorphism bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphism">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="body">Content</Label>
                  <textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full p-3 border rounded-md min-h-[120px] resize-none"
                    placeholder="Write your post content..."
                  />
                </div>
                <div>
                  <Label htmlFor="audience">Audience</Label>
                  <Select value={formData.audience} onValueChange={(value) => setFormData(prev => ({ ...prev, audience: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="teachers">Teachers</SelectItem>
                      <SelectItem value="parents">Parents</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Create Post</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {posts?.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glassmorphism hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
                      <p className="text-gray-600 mb-3">{post.body}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>By {post.author?.first_name} {post.author?.last_name}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        {getAudienceBadge(post.audience)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(post)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {posts?.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-500">Create your first community post to get started.</p>
            </motion.div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="glassmorphism">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-body">Content</Label>
                <textarea
                  id="edit-body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full p-3 border rounded-md min-h-[120px] resize-none"
                  placeholder="Write your post content..."
                />
              </div>
              <div>
                <Label htmlFor="edit-audience">Audience</Label>
                <Select value={formData.audience} onValueChange={(value) => setFormData(prev => ({ ...prev, audience: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Update Post</Button>
                <Button type="button" variant="outline" onClick={() => setEditingPost(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
      
      <Footer />
    </div>
  );
} 