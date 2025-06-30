'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Megaphone, Calendar, Clock, AlertTriangle, Info, CheckCircle, Eye, Users } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  target_audience: 'parents' | 'all';
  published_at: string;
  created_at: string;
}

export default function ParentAnnouncements() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // Mock loading state and data until API is implemented
  const isLoading = false;
  const announcements: Announcement[] = [
    {
      id: '1',
      title: 'Parent-Teacher Meeting Schedule',
      content: 'We are pleased to announce the upcoming Parent-Teacher Meeting scheduled for next week. This is an excellent opportunity to discuss your child\'s academic progress, address any concerns, and collaborate on their educational journey. Please confirm your attendance by responding to this announcement.',
      priority: 'high',
      target_audience: 'parents',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'School Fee Payment Reminder',
      content: 'This is a friendly reminder that the quarterly school fees are due by the end of this month. Please ensure timely payment to avoid any late fees. You can pay online through our parent portal or visit the school office during working hours.',
      priority: 'normal',
      target_audience: 'parents',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'School Health and Safety Guidelines',
      content: 'In light of recent health concerns, we are implementing updated health and safety guidelines. Please ensure your child follows these protocols and inform the school immediately if your child shows any symptoms of illness.',
      priority: 'urgent',
      target_audience: 'all',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Field Trip Permission Forms',
      content: 'Permission forms for the upcoming educational field trip are now available. Please download, fill out, and return the signed forms by the specified deadline. This trip is part of our environmental science curriculum.',
      priority: 'normal',
      target_audience: 'parents',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      title: 'Parent Workshop: Digital Learning Tools',
      content: 'Join us for an informative workshop on digital learning tools and how to support your child\'s online education. Learn about the platforms we use, homework submission systems, and tips for creating an effective study environment at home.',
      priority: 'low',
      target_audience: 'parents',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'normal':
        return <Info className="w-4 h-4 text-blue-600" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="animate-pulse">🚨 Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">⚠️ High Priority</Badge>;
      case 'normal':
        return <Badge variant="default">📢 Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">ℹ️ Low Priority</Badge>;
      default:
        return <Badge variant="outline">📢 Notice</Badge>;
    }
  };

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case 'parents':
        return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">👨‍👩‍👧‍👦 Parents Only</Badge>;
      case 'all':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">🏫 School Community</Badge>;
      default:
        return <Badge variant="outline">📢 General</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const filteredAnnouncements = announcements.filter((announcement: Announcement) => {
    if (filter === 'all') return true;
    return announcement.priority === filter;
  });

  const stats = {
    total: announcements.length,
    urgent: announcements.filter((a: Announcement) => a.priority === 'urgent').length,
    high: announcements.filter((a: Announcement) => a.priority === 'high').length,
    normal: announcements.filter((a: Announcement) => a.priority === 'normal').length,
    low: announcements.filter((a: Announcement) => a.priority === 'low').length,
    parentsOnly: announcements.filter((a: Announcement) => a.target_audience === 'parents').length,
  };

  const handleViewDetails = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Announcements</h1>
          <p className="text-gray-600 mt-2">
            Stay informed about important school updates and your child's education.
          </p>
        </div>
        
        {/* Filter */}
        <Select value={filter} onValueChange={(value: 'all' | 'urgent' | 'high' | 'normal' | 'low') => setFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Announcements</SelectItem>
            <SelectItem value="urgent">🚨 Urgent</SelectItem>
            <SelectItem value="high">⚠️ High Priority</SelectItem>
            <SelectItem value="normal">📢 Normal</SelectItem>
            <SelectItem value="low">ℹ️ Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All announcements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <p className="text-xs text-muted-foreground">Important</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal</CardTitle>
            <Info className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.normal}</div>
            <p className="text-xs text-muted-foreground">Regular updates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.low}</div>
            <p className="text-xs text-muted-foreground">Informational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">For Parents</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.parentsOnly}</div>
            <p className="text-xs text-muted-foreground">Parent-specific</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAnnouncements.length > 0 ? (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`border-l-4 rounded-lg p-4 ${getPriorityColor(announcement.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {getPriorityIcon(announcement.priority)}
                        <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                        {getPriorityBadge(announcement.priority)}
                        {getAudienceBadge(announcement.target_audience)}
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {announcement.content}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(announcement.published_at), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(announcement)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No Announcements' : `No ${filter} priority announcements`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'No announcements have been posted yet.' 
                  : `There are no ${filter} priority announcements at the moment.`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcement Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getPriorityIcon(selectedAnnouncement.priority)}
                  {selectedAnnouncement.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Priority and Audience */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(selectedAnnouncement.priority)}
                    {getAudienceBadge(selectedAnnouncement.target_audience)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Published {format(new Date(selectedAnnouncement.published_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                  </div>
                </div>
                
                {/* Content */}
                <div className={`border-l-4 p-4 rounded-lg ${getPriorityColor(selectedAnnouncement.priority)}`}>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedAnnouncement.content}
                  </p>
                </div>
                
                {/* Time Info */}
                <div className="text-sm text-gray-500 border-t pt-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Posted {formatDistanceToNow(new Date(selectedAnnouncement.published_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Important Notice for Parents */}
      {stats.urgent > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Important Notice for Parents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              You have {stats.urgent} urgent announcement{stats.urgent > 1 ? 's' : ''} that require{stats.urgent === 1 ? 's' : ''} your immediate attention. 
              These may involve your child's education, school policies, or urgent matters requiring parent action.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parent Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Stay Connected with Your Child's Education</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-blue-600">📋 Parent Action Items</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Check announcements daily for important updates</li>
                <li>• Respond promptly to permission forms and notices</li>
                <li>• Attend parent-teacher meetings and school events</li>
                <li>• Keep contact information updated with the school</li>
                <li>• Discuss school announcements with your child</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 text-green-600">🏫 School Communication</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 🚨 Urgent: Immediate action or response required</li>
                <li>• ⚠️ High: Important school matters and deadlines</li>
                <li>• 📢 Normal: Regular updates and school news</li>
                <li>• ℹ️ Low: General information and reminders</li>
                <li>• 👨‍👩‍👧‍👦 Parent-specific announcements require your attention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 