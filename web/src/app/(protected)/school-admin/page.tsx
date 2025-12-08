'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Building2, 
  Award,
  BookOpen,
  Clock,
  BarChart3,
  Plus,
  FileText,
  Calendar,
  Megaphone,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import StatusCard from '@/components/ui/status-card';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalSections: number;
  attendanceRate: number;
  upcomingExams: number;
  pendingHomework: number;
  announcements: number;
}

async function fetchDashboardStats(schoolId: string): Promise<DashboardStats> {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const [
    studentsResponse,
    teachersResponse,
    parentsResponse,
    sectionsResponse,
    // Real queries for previously mocked data
    announcementsResponse,
    upcomingExamsResponse,
    // Note: Attendance and homework would need more complex queries
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact' }).eq('school_id', schoolId),
    supabase.from('users').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('role', 'teacher'),
    supabase.from('users').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('role', 'parent'),
    supabase.from('sections').select('id', { count: 'exact' }).eq('school_id', schoolId),
    // Get published announcements count
    supabase.from('announcements').select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('is_published', true),
    // Get upcoming exams (if exam_papers table exists)
    supabase.from('exam_papers').select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .gte('exam_date', today.toISOString())
      .lte('exam_date', nextWeek.toISOString()),
  ]);

  // Calculate attendance rate (simplified - would need actual attendance data)
  let attendanceRate = 0;
  if (studentsResponse.count && studentsResponse.count > 0) {
    // For now, set to 0 for new schools, or calculate from actual attendance data
    attendanceRate = 0;
  }

  return {
    totalStudents: studentsResponse.count || 0,
    totalTeachers: teachersResponse.count || 0,
    totalParents: parentsResponse.count || 0,
    totalSections: sectionsResponse.count || 0,
    attendanceRate: attendanceRate,
    upcomingExams: upcomingExamsResponse.count || 0,
    pendingHomework: 0, // Would need homework table query
    announcements: announcementsResponse.count || 0,
  };
}

const getKpiCards = (stats?: DashboardStats) => {
  const isNewSchool = !stats || (stats.totalStudents === 0 && stats.totalTeachers === 0 && stats.totalSections === 0);
  
  return [
    {
      title: 'Total Students',
      key: 'totalStudents' as keyof DashboardStats,
      icon: GraduationCap,
      trend: isNewSchool ? 'Get started' : 'Active enrollments',
      description: isNewSchool ? 'Add your first students' : 'Active enrollments',
    },
    {
      title: 'Teaching Staff',
      key: 'totalTeachers' as keyof DashboardStats,
      icon: UserCheck,
      trend: isNewSchool ? 'Setup required' : 'Faculty members',
      description: isNewSchool ? 'Add teaching staff' : 'Faculty members',
    },
    {
      title: 'Parent Community',
      key: 'totalParents' as keyof DashboardStats,
      icon: Users,
      trend: isNewSchool ? 'Coming soon' : 'Registered parents',
      description: isNewSchool ? 'Parents will join' : 'Registered parents',
    },
    {
      title: 'Classes',
      key: 'totalSections' as keyof DashboardStats,
      icon: Building2,
      trend: isNewSchool ? 'Create classes' : 'Active sections',
      description: isNewSchool ? 'Setup class structure' : 'Active sections',
    },
    {
      title: 'Attendance Rate',
      key: 'attendanceRate' as keyof DashboardStats,
      icon: Award,
      trend: isNewSchool ? 'No data yet' : 'This week',
      description: isNewSchool ? 'Track once active' : 'This week',
      suffix: '%',
    },
    {
      title: 'Upcoming Exams',
      key: 'upcomingExams' as keyof DashboardStats,
      icon: BookOpen,
      trend: isNewSchool ? 'Schedule exams' : 'Next 7 days',
      description: isNewSchool ? 'Plan assessments' : 'Scheduled tests',
    },
    {
      title: 'Pending Tasks',
      key: 'pendingHomework' as keyof DashboardStats,
      icon: Clock,
      trend: isNewSchool ? 'No tasks yet' : 'Submissions',
      description: isNewSchool ? 'Assign homework later' : 'Homework submissions',
    },
    {
      title: 'Announcements',
      key: 'announcements' as keyof DashboardStats,
      icon: BarChart3,
      trend: isNewSchool ? 'Start communicating' : 'Recent posts',
      description: isNewSchool ? 'Share important updates' : 'Recent posts',
    },
  ];
};

const quickActions = [
  { name: 'Add Student', href: '/school-admin/students?action=create', icon: GraduationCap },
  { name: 'Add Teacher', href: '/school-admin/teachers?action=create', icon: UserCheck },
  { name: 'Create Class', href: '/school-admin/sections?action=create', icon: Building2 },
  { name: 'Schedule Exam', href: '/school-admin/exams?action=create', icon: BookOpen },
  
  { name: 'New Announcement', href: '/school-admin/announcements?action=create', icon: Megaphone },
];

export default function SchoolAdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.school_id],
    queryFn: () => fetchDashboardStats(user!.school_id!),
    enabled: !!user?.school_id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes (reduced from 30 seconds)
    refetchOnWindowFocus: false, // Don't refetch when user switches back to tab
    retry: 2,
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="card-flat p-6 rounded-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Gradient Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 md:p-10 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
        }}
      >
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold">
            {stats && stats.totalStudents === 0 && stats.totalTeachers === 0 && stats.totalSections === 0 
              ? `Welcome to your new school, ${user?.first_name || 'Admin'}!`
              : `Welcome back, ${user?.first_name || 'Admin'}!`
            }
          </h2>
          <p className="mt-2 opacity-90 text-lg">
            {stats && stats.totalStudents === 0 && stats.totalTeachers === 0 && stats.totalSections === 0
              ? "Let's get your school management system set up and running."
              : "Here's the latest snapshot of your school management system."
            }
          </p>
          
          <div className="mt-6 flex items-center space-x-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors">
              CampusHoster
            </Badge>
            <div className="flex items-center text-sm opacity-80">
              <TrendingUp className="h-4 w-4 mr-1" />
              {stats && stats.totalStudents === 0 && stats.totalTeachers === 0 && stats.totalSections === 0
                ? "Ready for setup"
                : "All systems operational"
              }
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-24 translate-y-24"></div>
      </motion.div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {getKpiCards(stats).map((card, index) => {
          const Icon = card.icon;
          const value = stats?.[card.key] || 0;
          
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="kpi-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {value}{card.suffix || ''}
                        </div>
                        <div className="text-sm text-muted-foreground">{card.title}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {card.trend}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {card.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Getting Started Section for New Schools */}
      {stats && stats.totalStudents === 0 && stats.totalTeachers === 0 && stats.totalSections === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center text-primary">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <BookOpen className="h-5 w-5" />
                </div>
                🎉 Welcome to your new school!
              </CardTitle>
              <p className="text-muted-foreground">
                Get started by setting up your school's basic structure. Follow these steps to begin managing your educational institution.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/school-admin/teachers?action=create">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">1. Add Teachers</h4>
                          <p className="text-sm text-muted-foreground">Start by adding your teaching staff to the system.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/school-admin/sections?action=create">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">2. Create Classes</h4>
                          <p className="text-sm text-muted-foreground">Set up your class structure and assign teachers.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/school-admin/students?action=create">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <GraduationCap className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">3. Add Students</h4>
                          <p className="text-sm text-muted-foreground">Enroll students and assign them to classes.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Optional Next Steps
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <Link href="/school-admin/timetable" className="text-primary hover:underline">
                    • Set up class timetables
                  </Link>
                  <Link href="/school-admin/announcements?action=create" className="text-primary hover:underline">
                    • Create your first announcement
                  </Link>
                  <Link href="/school-admin/exams?action=create" className="text-primary hover:underline">
                    • Schedule examinations
                  </Link>
                  <Link href="/school-admin/parents" className="text-primary hover:underline">
                    • Invite parent community
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Status Cards Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">System Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            title="Pending Tasks"
            body="Review applications, approve requests"
            color="primary"
          />
          <StatusCard
            title="Announcements"
            body="Active notices and important updates"
            color="secondary"
          />
          <StatusCard
            title="System Status"
            body="All systems running smoothly"
            color="accent"
          />
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="card-flat">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <Plus className="h-5 w-5 mr-2 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 overflow-x-auto md:grid md:grid-cols-3 md:gap-4 pb-4 md:pb-0">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.name} href={action.href}>
                    <Card className="quick-action-card min-w-[200px] md:min-w-0">
                      <CardContent className="p-4 flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium whitespace-nowrap">{action.name}</span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
} 