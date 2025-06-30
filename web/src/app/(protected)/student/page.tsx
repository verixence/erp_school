'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStudentDashboardStats } from '../../../../../common/src/api/student';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, TrendingUp, Clock, Users, Bell } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStudentDashboardStats(user?.id);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's an overview of your academic progress.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todaysClasses || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingHomework || 0}</div>
            <p className="text-xs text-muted-foreground">
              Due in next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendancePercentage || 0}%</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentAnnouncements || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recent updates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Check Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              View your daily attendance records and track your presence.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Submit Homework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              View and submit your homework assignments before the deadline.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              View Timetable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Check your class schedule and upcoming subjects.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Attendance marked for today</p>
                <p className="text-xs text-gray-500">Present - Marked by teacher</p>
              </div>
              <Badge variant="default">New</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">New homework assignment</p>
                <p className="text-xs text-gray-500">Mathematics - Due in 3 days</p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Users className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Homework submitted</p>
                <p className="text-xs text-gray-500">English essay - Submitted on time</p>
              </div>
              <Badge variant="default">Completed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 