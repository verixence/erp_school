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
  const [
    studentsResponse,
    teachersResponse,
    parentsResponse,
    sectionsResponse,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact' }).eq('school_id', schoolId),
    supabase.from('users').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('role', 'teacher'),
    supabase.from('users').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('role', 'parent'),
    supabase.from('sections').select('id', { count: 'exact' }).eq('school_id', schoolId),
  ]);

  return {
    totalStudents: studentsResponse.count || 0,
    totalTeachers: teachersResponse.count || 0,
    totalParents: parentsResponse.count || 0,
    totalSections: sectionsResponse.count || 0,
    attendanceRate: 85.4, // Mock data
    upcomingExams: 3, // Mock data
    pendingHomework: 12, // Mock data
    announcements: 5, // Mock data
  };
}

const kpiCards = [
  {
    title: 'Total Students',
    key: 'totalStudents' as keyof DashboardStats,
    icon: GraduationCap,
    trend: '+12%',
    description: 'Active enrollments',
  },
  {
    title: 'Teaching Staff',
    key: 'totalTeachers' as keyof DashboardStats,
    icon: UserCheck,
    trend: '+3%',
    description: 'Faculty members',
  },
  {
    title: 'Parent Community',
    key: 'totalParents' as keyof DashboardStats,
    icon: Users,
    trend: '+8%',
    description: 'Registered parents',
  },
  {
    title: 'Classes',
    key: 'totalSections' as keyof DashboardStats,
    icon: Building2,
    trend: 'Stable',
    description: 'Active sections',
  },
  {
    title: 'Attendance Rate',
    key: 'attendanceRate' as keyof DashboardStats,
    icon: Award,
    trend: '+2.1%',
    description: 'This week',
    suffix: '%',
  },
  {
    title: 'Upcoming Exams',
    key: 'upcomingExams' as keyof DashboardStats,
    icon: BookOpen,
    trend: 'Next 7 days',
    description: 'Scheduled tests',
  },
  {
    title: 'Pending Tasks',
    key: 'pendingHomework' as keyof DashboardStats,
    icon: Clock,
    trend: '-15%',
    description: 'Homework submissions',
  },
  {
    title: 'Announcements',
    key: 'announcements' as keyof DashboardStats,
    icon: BarChart3,
    trend: 'Active',
    description: 'Recent posts',
  },
];

const quickActions = [
  { name: 'Add Student', href: '/school-admin/students?action=create', icon: GraduationCap },
  { name: 'Add Teacher', href: '/school-admin/teachers?action=create', icon: UserCheck },
  { name: 'Create Class', href: '/school-admin/sections?action=create', icon: Building2 },
  { name: 'Schedule Exam', href: '/school-admin/exams?action=create', icon: BookOpen },
  { name: 'Create Report', href: '/school-admin/reports?action=create', icon: FileText },
  { name: 'New Announcement', href: '/school-admin/announcements?action=create', icon: Megaphone },
];

export default function SchoolAdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.school_id],
    queryFn: () => fetchDashboardStats(user!.school_id!),
    enabled: !!user?.school_id,
    refetchInterval: 30000, // Refresh every 30 seconds
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
        className="rounded-3xl p-6 md:p-10 text-white hero-gradient-tri min-h-[120px] md:min-h-[200px] relative overflow-hidden"
      >
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold">Welcome back, {user?.first_name || 'Admin'}!</h2>
          <p className="mt-2 opacity-90 text-lg">Here's the latest snapshot of your school management system.</p>
          
          <div className="mt-6 flex items-center space-x-4">
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                CampusHoster
              </Badge>
            <div className="flex items-center text-sm opacity-80">
              <TrendingUp className="h-4 w-4 mr-1" />
              All systems operational
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-24 translate-y-24"></div>
      </motion.div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
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