'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCommunityAnnouncements, useCreateAnnouncement } from '@erp/common';
import { Megaphone, Users, Upload, X, Plus, AlertCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'teachers' | 'parents' | 'students'>('all');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: announcements, refetch } = useCommunityAnnouncements(user?.school_id || '', targetAudience);
  const createAnnouncementMutation = useCreateAnnouncement();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAnnouncementMutation.mutateAsync({
        school_id: user?.school_id || '',
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        priority,
        is_published: true,
        created_by: user?.id || ''
      });

      toast.success('Announcement created successfully!');
      setTitle('');
      setContent('');
      setSelectedFiles([]);
      setTargetAudience('all');
      setPriority('normal');
      refetch();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAudienceBadge = (aud: string) => {
    const variants = {
      all: 'default',
      teachers: 'secondary',
      parents: 'outline',
      students: 'destructive'
    } as const;

    return (
      <Badge variant={variants[aud as keyof typeof variants] || 'default'}>
        {aud}
      </Badge>
    );
  };

  const getPriorityBadge = (prio: string) => {
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
      <Badge variant={variants[prio as keyof typeof variants] || 'default'} className={colors[prio as keyof typeof colors]}>
        {prio.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityIcon = (prio: string) => {
    switch (prio) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Megaphone className="h-8 w-8 text-purple-600" />
            Teacher Announcements
          </h1>
          <p className="text-gray-600 mt-2">Create important announcements for the school community</p>
        </div>

        {/* Create Announcement Form */}
        <Card className="glassmorphism">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Announcement Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's the title of your announcement?"
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Announcement Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share important information or updates..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={targetAudience} onValueChange={(value: any) => setTargetAudience(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="teachers">Teachers Only</SelectItem>
                      <SelectItem value="parents">Parents Only</SelectItem>
                      <SelectItem value="students">Students Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <Label>Attachments (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload images, documents, or other files</span>
                  </label>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label>Selected Files:</Label>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Creating Announcement...' : 'Create Announcement'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Recent Announcements {getAudienceBadge(targetAudience)}
          </h2>
          
          {announcements && announcements.length > 0 ? (
            announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glassmorphism hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getPriorityIcon(announcement.priority || 'normal')}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{announcement.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>By {announcement.author?.first_name} {announcement.author?.last_name}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                            <span>•</span>
                            {getAudienceBadge(announcement.target_audience || 'all')}
                            <span>•</span>
                            {getPriorityBadge(announcement.priority || 'normal')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-gray-700 mb-4">
                      {announcement.content}
                    </div>

                    {/* Media Display */}
                    {announcement.media_urls && announcement.media_urls.length > 0 && (
                      <div className="space-y-2">
                        <Label>Attachments:</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {announcement.media_urls.map((url, idx) => (
                            <div key={idx} className="relative rounded-lg overflow-hidden">
                              {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img
                                  src={url}
                                  alt={`Attachment ${idx + 1}`}
                                  className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(url, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                     onClick={() => window.open(url, '_blank')}>
                                  <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="glassmorphism">
              <CardContent className="text-center py-12">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
                <p className="text-gray-600">Create your first announcement to share important information!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
} 