'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Video, ExternalLink, BookOpen } from 'lucide-react';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';

interface OnlineClass {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  meeting_link: string;
  meeting_password?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  teacher?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  student_names?: string[];
}

export default function ParentOnlineClassesPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  // Fetch online classes for parent's students
  const { data: onlineClasses = [], isLoading } = useQuery({
    queryKey: ['parent-online-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('online_class_participants')
        .select(`
          online_class:online_classes(
            id,
            title,
            description,
            subject,
            meeting_link,
            meeting_password,
            scheduled_date,
            start_time,
            end_time,
            duration_minutes,
            status,
            teacher:users!teacher_id(first_name, last_name, email)
          ),
          student:students(id, full_name, admission_no, grade, section)
        `)
        .eq('parent_id', user.id)
        .neq('online_class.status', 'cancelled');

      if (error) throw error;
      
      // Transform the data to group by online class
      const classesMap = new Map<string, OnlineClass>();
      
      data?.forEach((participant: any) => {
        const onlineClass = participant.online_class;
        if (onlineClass) {
          const existingClass = classesMap.get(onlineClass.id);
          if (existingClass) {
            existingClass.student_names?.push(participant.student?.full_name || 'Unknown');
          } else {
            classesMap.set(onlineClass.id, {
              ...onlineClass,
              student_names: [participant.student?.full_name || 'Unknown']
            });
          }
        }
      });
      
      return Array.from(classesMap.values()).sort((a, b) => {
        // Sort by scheduled_date first, then by start_time
        const dateCompare = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassStatus = (onlineClass: OnlineClass) => {
    const now = new Date();
    const classDate = new Date(`${onlineClass.scheduled_date}T${onlineClass.start_time}`);
    const classEndDate = new Date(`${onlineClass.scheduled_date}T${onlineClass.end_time}`);
    
    if (onlineClass.status === 'completed') return 'completed';
    if (onlineClass.status === 'cancelled') return 'cancelled';
    
    if (isAfter(now, classEndDate)) return 'completed';
    if (isAfter(now, classDate) && isBefore(now, classEndDate)) return 'ongoing';
    if (isBefore(now, classDate)) return 'scheduled';
    
    return 'scheduled';
  };

  const canJoinClass = (onlineClass: OnlineClass) => {
    const now = new Date();
    const classDate = new Date(`${onlineClass.scheduled_date}T${onlineClass.start_time}`);
    const classEndDate = new Date(`${onlineClass.scheduled_date}T${onlineClass.end_time}`);
    const joinWindow = addMinutes(classDate, -15); // Can join 15 minutes before
    
    return isAfter(now, joinWindow) && isBefore(now, classEndDate);
  };

  const filteredClasses = onlineClasses.filter(onlineClass => {
    const status = getClassStatus(onlineClass);
    
    switch (selectedFilter) {
      case 'upcoming':
        return status === 'scheduled' || status === 'ongoing';
      case 'completed':
        return status === 'completed';
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Online Classes</h1>
          <p className="text-gray-600">View scheduled virtual classes for your children</p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={selectedFilter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('upcoming')}
            size="sm"
          >
            Upcoming
          </Button>
          <Button
            variant={selectedFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('completed')}
            size="sm"
          >
            Completed
          </Button>
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('all')}
            size="sm"
          >
            All
          </Button>
        </div>
      </div>

      {/* Online Classes List */}
      <div className="grid gap-6">
        {filteredClasses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Video className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedFilter === 'upcoming' ? 'No upcoming classes' : 
                 selectedFilter === 'completed' ? 'No completed classes' : 
                 'No online classes scheduled'}
              </h3>
              <p className="text-gray-600 text-center">
                {selectedFilter === 'upcoming' 
                  ? 'Check back later for new class schedules from your children\'s teachers.'
                  : selectedFilter === 'completed'
                  ? 'Completed classes will appear here after they finish.'
                  : 'Online classes scheduled by teachers will appear here.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClasses.map((onlineClass) => {
            const currentStatus = getClassStatus(onlineClass);
            const joinable = canJoinClass(onlineClass);
            
            return (
              <Card key={onlineClass.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{onlineClass.title}</CardTitle>
                        <Badge className={getStatusColor(currentStatus)}>
                          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                        </Badge>
                        {joinable && (
                          <Badge className="bg-green-100 text-green-800">
                            Can Join Now
                          </Badge>
                        )}
                      </div>
                      {onlineClass.subject && (
                        <CardDescription className="text-base font-medium">
                          Subject: {onlineClass.subject}
                        </CardDescription>
                      )}
                      {onlineClass.description && (
                        <CardDescription className="mt-1">
                          {onlineClass.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Date and Time */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">
                          {format(new Date(onlineClass.scheduled_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {onlineClass.start_time} - {onlineClass.end_time}
                        </p>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">{onlineClass.duration_minutes} minutes</p>
                        <p className="text-sm text-gray-600">Duration</p>
                      </div>
                    </div>

                    {/* Teacher */}
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">
                          {onlineClass.teacher?.first_name} {onlineClass.teacher?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">Teacher</p>
                      </div>
                    </div>

                    {/* Students */}
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">
                          {onlineClass.student_names?.join(', ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {onlineClass.student_names?.length === 1 ? 'Student' : 'Students'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Link */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">Meeting Link</p>
                        <p className="text-sm text-gray-600 truncate max-w-md">
                          {currentStatus === 'completed' 
                            ? 'Class has ended' 
                            : joinable || currentStatus === 'ongoing'
                            ? onlineClass.meeting_link
                            : 'Link will be available 15 minutes before class'
                          }
                        </p>
                        {onlineClass.meeting_password && (joinable || currentStatus === 'ongoing') && (
                          <p className="text-sm text-gray-600 mt-1">
                            Password: {onlineClass.meeting_password}
                          </p>
                        )}
                      </div>
                      
                      {(joinable || currentStatus === 'ongoing') && currentStatus !== 'completed' && (
                        <Button
                          onClick={() => window.open(onlineClass.meeting_link, '_blank')}
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Join Class
                        </Button>
                      )}
                    </div>
                    
                    {!joinable && currentStatus === 'scheduled' && (
                      <p className="text-xs text-gray-500 mt-2">
                        You can join this class starting 15 minutes before the scheduled time.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
} 