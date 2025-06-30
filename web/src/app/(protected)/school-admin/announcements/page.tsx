'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useAllAnnouncements, createAnnouncement, deleteAnnouncement, updateAnnouncement } from '@erp/common';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Megaphone, Eye, EyeOff } from 'lucide-react';
import { Footer } from '@/components/ui/footer';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { data: announcements, refetch } = useAllAnnouncements(user?.school_id || '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    priority: 'normal',
    is_published: false
  });

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;

    const newAnnouncement = await createAnnouncement(user.school_id, formData);
    if (newAnnouncement) {
      setFormData({ title: '', content: '', target_audience: 'all', priority: 'normal', is_published: false });
      setIsCreateOpen(false);
      refetch();
    }
  };

  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;

    const updatedAnnouncement = await updateAnnouncement(editingAnnouncement.id, formData);
    if (updatedAnnouncement) {
      setFormData({ title: '', content: '', target_audience: 'all', priority: 'normal', is_published: false });
      setEditingAnnouncement(null);
      refetch();
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      const success = await deleteAnnouncement(announcementId);
      if (success) {
        refetch();
      }
    }
  };

  const openEditDialog = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience,
      priority: announcement.priority,
      is_published: announcement.is_published
    });
  };

  const getPriorityBadge = (priority: string) => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-purple-600" />
              Announcements
            </h1>
            <p className="text-gray-600 mt-2">Create and manage school announcements</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="glassmorphism bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphism">
              <DialogHeader>
                <DialogTitle>Create New Announcement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
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
                  <Label htmlFor="content">Content</Label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full p-3 border rounded-md min-h-[120px] resize-none"
                    placeholder="Write your announcement content..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="audience">Audience</Label>
                    <Select value={formData.target_audience} onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}>
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
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="published">Publish immediately</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Create Announcement</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {announcements?.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glassmorphism hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{announcement.title}</h3>
                        {announcement.is_published ? (
                          <Eye className="w-5 h-5 text-green-600" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{announcement.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>By {announcement.author?.first_name} {announcement.author?.last_name}</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        {getAudienceBadge(announcement.target_audience)}
                        <span>•</span>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {announcements?.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
              <p className="text-gray-500">Create your first announcement to get started.</p>
            </motion.div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
          <DialogContent className="glassmorphism">
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditAnnouncement} className="space-y-4">
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
                <Label htmlFor="edit-content">Content</Label>
                <textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-3 border rounded-md min-h-[120px] resize-none"
                  placeholder="Write your announcement content..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-audience">Audience</Label>
                  <Select value={formData.target_audience} onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}>
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
                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="edit-published">Published</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Update Announcement</Button>
                <Button type="button" variant="outline" onClick={() => setEditingAnnouncement(null)}>
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