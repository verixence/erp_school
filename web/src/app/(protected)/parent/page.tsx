'use client';

import { useAuth } from '@/hooks/use-auth';
import { useChildren, useParentDashboardStats } from '@/hooks/use-parent';
import { useParentOnlineClasses } from '@erp/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, TrendingUp, Clock, Video, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  
  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);
  const { data: stats, isLoading: statsLoading } = useParentDashboardStats(user?.id);
  const { data: allOnlineClasses = [] } = useParentOnlineClasses(user?.id || '');

  // Set default selected child when children load
  if (children && children.length > 0 && !selectedChild) {
    setSelectedChild(children[0].id);
  }

  const currentChild = children?.find(child => child.id === selectedChild);

  // Filter today's online classes
  const today = new Date().toISOString().split('T')[0];
  const todaysOnlineClasses = allOnlineClasses.filter(onlineClass => 
    onlineClass.scheduled_date === today && onlineClass.status !== 'cancelled'
  );

  if (childrenLoading || statsLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here's an overview of your children's progress.
          </p>
        </div>
        
        {/* Child Selector */}
        {children && children.length > 1 && (
          <div className="min-w-48">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                                 {children.map((child) => (
                   <SelectItem key={child.id} value={child.id}>
                     {child.full_name} - Grade {child.sections?.grade}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.childrenCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled children
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingHomework || 0}</div>
            <p className="text-xs text-muted-foreground">
              Due in next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendancePercentage || 0}%</div>
            <p className="text-xs text-muted-foreground">
              This month average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">
              Last portal visit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Online Classes */}
      {todaysOnlineClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Today's Online Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todaysOnlineClasses.map((onlineClass) => (
              <Card key={onlineClass.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {onlineClass.title}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {onlineClass.subject}
                        </Badge>
                      </div>
                    </div>
                    <Badge 
                      className={
                        onlineClass.status === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800' 
                          : onlineClass.status === 'ongoing'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {onlineClass.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {onlineClass.start_time} - {onlineClass.end_time}
                    </div>
                    {(onlineClass as any).student_names && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        For: {(onlineClass as any).student_names.join(', ')}
                      </div>
                    )}
                    {onlineClass.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {onlineClass.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(onlineClass.meeting_link, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Join Class
                    </Button>
                    <Link href="/parent/online-classes">
                      <Button size="sm" variant="outline">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Current Child Info */}
      {currentChild && (
        <Card>
          <CardHeader>
                       <CardTitle className="flex items-center gap-2">
             <Users className="h-5 w-5" />
             {currentChild.full_name}
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <p className="text-sm font-medium text-gray-500">Grade & Section</p>
               <p className="text-lg font-semibold">
                 Grade {currentChild.sections?.grade} - Section {currentChild.sections?.section}
               </p>
             </div>
             <div>
               <p className="text-sm font-medium text-gray-500">Admission No</p>
               <p className="text-lg font-semibold">{currentChild.admission_no || 'N/A'}</p>
             </div>
             <div>
               <p className="text-sm font-medium text-gray-500">Gender</p>
               <p className="text-lg font-semibold">{currentChild.gender || 'N/A'}</p>
             </div>
           </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              View Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Check daily attendance records and patterns for your children.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Review Homework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              View assigned homework and submission status.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Academic Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Track academic performance and progress reports.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* No Children State */}
      {!childrenLoading && (!children || children.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-600">
              No children are currently linked to your account. Please contact the school administration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 