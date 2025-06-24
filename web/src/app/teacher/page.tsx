'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GraduationCap, Calendar, BookOpen, Users, CheckCircle, Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

function KPICard({ title, value, icon, color, onClick }: KPICardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600 mt-1">{title}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Teacher dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['teacher-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get today's classes count
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const { count: todaysClasses } = await supabase
        .from('timetables')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('weekday', today === 0 ? 7 : today); // Convert Sunday from 0 to 7

      // Get pending homework count (due in next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { count: pendingHomework } = await supabase
        .from('homeworks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0]);

      // Get sections count
      const { count: sectionsCount } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // Get recent announcements count
      const { count: recentAnnouncements } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_published', true)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      return {
        todaysClasses: todaysClasses || 0,
        pendingHomework: pendingHomework || 0,
        sectionsCount: sectionsCount || 0,
        recentAnnouncements: recentAnnouncements || 0,
      };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.replace('/not-authorized');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Teacher Portal</h1>
            </div>
            <div className="text-sm text-gray-600">
              Welcome, {user.email}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Overview of your teaching activities</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Today's Classes"
            value={stats?.todaysClasses || 0}
            icon={<Calendar className="w-6 h-6 text-white" />}
            color="bg-blue-500"
            onClick={() => router.push('/teacher/timetable')}
          />
          <KPICard
            title="Pending Homework"
            value={stats?.pendingHomework || 0}
            icon={<BookOpen className="w-6 h-6 text-white" />}
            color="bg-green-500"
            onClick={() => router.push('/teacher/homework')}
          />
          <KPICard
            title="My Sections"
            value={stats?.sectionsCount || 0}
            icon={<Users className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
          <KPICard
            title="Recent Announcements"
            value={stats?.recentAnnouncements || 0}
            icon={<FileText className="w-6 h-6 text-white" />}
            color="bg-orange-500"
            onClick={() => router.push('/teacher/announcements')}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
                  <p className="text-gray-600">Record student attendance for today</p>
                </div>
              </div>
              <Button 
                onClick={() => router.push('/teacher/attendance')}
                className="w-full"
              >
                Go to Attendance
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assign Homework</h3>
                  <p className="text-gray-600">Create new homework assignments</p>
                </div>
              </div>
              <Button 
                onClick={() => router.push('/teacher/homework/new')}
                className="w-full"
                variant="outline"
              >
                Create Homework
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-3 rounded-full mr-4">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">View Timetable</h3>
                  <p className="text-gray-600">Check your class schedule</p>
                </div>
              </div>
              <Button 
                onClick={() => router.push('/teacher/timetable')}
                className="w-full"
                variant="outline"
              >
                View Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 