'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  BookOpen, 
  TrendingUp,
  FileText,
  Settings,
  ChevronRight,
  School2,
  LogOut,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardStats {
  students: number;
  teachers: number;
  parents: number;
  classes: number;
  activeModules: number;
  totalModules: number;
  attendanceData: Array<{ date: string; percentage: number; }>;
  recentActivity: Array<{ 
    action: string; 
    entity: string; 
    time: string; 
    user: string; 
  }>;
  hasAttendanceData: boolean;
  hasActivityData: boolean;
  attendanceRate: number;
}

export default function SchoolAdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['school-admin-dashboard', user?.school_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.school_id) throw new Error('No school ID');

      // Fetch students count
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id);

      // Fetch teachers count  
      const { count: teachersCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id);

      // Fetch parents count (distinct)
      const { count: parentsCount } = await supabase
        .from('students')
        .select('parent_id', { count: 'exact', head: true })
        .eq('school_id', user.school_id)
        .not('parent_id', 'is', null);

      // Get school info
      const { data: school } = await supabase
        .from('schools')
        .select('enabled_features')
        .eq('id', user.school_id)
        .single();

      const enabledModules = school?.enabled_features 
        ? Object.values(school.enabled_features).filter(Boolean).length 
        : 0;
      const totalModules = school?.enabled_features 
        ? Object.keys(school.enabled_features).length 
        : 0;

      // Fetch real attendance data for the last 30 days using optimized function
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Try optimized function first, fallback to original if not available
      let attendanceStats;
      try {
        const { data } = await supabase
          .rpc('get_attendance_stats_optimized', {
            start_date: thirtyDaysAgo.toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            school_id_param: user.school_id
          });
        attendanceStats = data;
      } catch (error) {
        // Fallback to original function
        const { data } = await supabase
          .rpc('get_attendance_stats', {
            start_date: thirtyDaysAgo.toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            school_id_param: user.school_id
          });
        attendanceStats = data;
      }

      // Get daily attendance data for chart
      const { data: dailyAttendance } = await supabase
        .from('attendance_records')
        .select('date, status')
        .eq('school_id', user.school_id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date');

      // Process daily attendance data
      const attendanceMap = new Map();
      dailyAttendance?.forEach(record => {
        const date = record.date;
        if (!attendanceMap.has(date)) {
          attendanceMap.set(date, { present: 0, total: 0 });
        }
        const dayData = attendanceMap.get(date);
        dayData.total++;
        if (record.status === 'present' || record.status === 'late') {
          dayData.present++;
        }
      });

      const attendanceData = Array.from(attendanceMap.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
      }));

      // Fetch recent audit logs for activity
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select(`
          action,
          table_name,
          created_at,
          users:user_id (
            email
          )
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Process recent activity
      const recentActivity = auditLogs?.map(log => {
        const timeAgo = new Date(log.created_at);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - timeAgo.getTime()) / (1000 * 60));
        
        let timeString = '';
        if (diffMinutes < 1) timeString = 'Just now';
        else if (diffMinutes < 60) timeString = `${diffMinutes} minutes ago`;
        else if (diffMinutes < 1440) timeString = `${Math.floor(diffMinutes / 60)} hours ago`;
        else timeString = `${Math.floor(diffMinutes / 1440)} days ago`;

        return {
          action: log.action,
          entity: log.table_name,
          time: timeString,
          user: (log.users as any)?.email?.split('@')[0] || 'System'
        };
      }) || [];

              const attendanceRate = attendanceStats?.[0]?.attendance_rate ? Math.round(attendanceStats[0].attendance_rate) : 0;

      return {
        students: studentsCount || 0,
        teachers: teachersCount || 0,
        parents: parentsCount || 0,
        classes: Math.floor((studentsCount || 0) / 25), // Assume 25 students per class
        activeModules: enabledModules,
        totalModules: totalModules,
        attendanceData,
        recentActivity,
        hasAttendanceData: (attendanceData.length > 0),
        hasActivityData: (recentActivity.length > 0),
        attendanceRate,
      };
    },
    enabled: !!user?.school_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes  
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const quickActions = [
    {
      title: 'Add Student',
      description: 'Register a new student',
      icon: Users,
      href: '/school-admin/students',
      color: 'bg-blue-500',
    },
    {
      title: 'Add Teacher',
      description: 'Add teaching staff',
      icon: GraduationCap,
      href: '/school-admin/teachers',
      color: 'bg-green-500',
    },
    {
      title: 'Manage Sections',
      description: 'Set up new sections',
      icon: BookOpen,
      href: '/school-admin/sections',
      color: 'bg-purple-500',
    },
    {
      title: 'Mark Attendance',
      description: 'Record daily attendance',
      icon: Calendar,
      href: '/school-admin/attendance',
      color: 'bg-orange-500',
    },
  ];

  const NoDataIllustration = ({ title, description }: { title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <School2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">School Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your school operations</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.students || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total enrolled students
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.teachers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Teaching staff members
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Parents</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.parents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered parents
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sections</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.classes || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active sections
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.attendanceRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  This month's rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Modules</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.activeModules || 0}/{stats?.totalModules || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active modules
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Attendance Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trend</CardTitle>
                <CardDescription>
                  Last 30 days attendance percentage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {stats?.hasAttendanceData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <NoDataIllustration
                      title="No Attendance Data"
                      description="Start recording daily attendance to see trends and analytics here."
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest actions in your school
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.hasActivityData ? (
                    stats.recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {activity.action} {activity.entity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {activity.user}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {activity.time}
                          </Badge>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <NoDataIllustration
                      title="No Recent Activity"
                      description="System activities and user actions will appear here once you start using the platform."
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <Link key={action.title} href={action.href}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {action.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
        >
          <Link href="/school-admin/students">
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 group-hover:text-primary transition-colors">
                  <Users className="w-5 h-5" />
                  <span>Manage Students</span>
                </CardTitle>
                <CardDescription>
                  View, add, and edit student information
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/school-admin/teachers">
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 group-hover:text-primary transition-colors">
                  <GraduationCap className="w-5 h-5" />
                  <span>Manage Teachers</span>
                </CardTitle>
                <CardDescription>
                  Handle teaching staff and assignments
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/school-admin/classes">
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 group-hover:text-primary transition-colors">
                  <BookOpen className="w-5 h-5" />
                  <span>Manage Classes</span>
                </CardTitle>
                <CardDescription>
                  Create and organize class schedules
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  );
} 