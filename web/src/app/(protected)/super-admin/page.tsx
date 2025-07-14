'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  School2, 
  Settings, 
  Users, 
  Shield,
  Plus,
  Activity,
  Database,
  LogOut,
  ArrowRight,
  TrendingUp,
  Building2,
  GraduationCap,
  UserCheck,
  Globe,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface School {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  website_url: string | null;
  email_address: string | null;
  school_type: string | null;
  total_capacity: number | null;
  principal_name: string | null;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
}

interface SchoolAnalytics {
  school_id: string;
  school_name: string;
  status: string;
  created_at: string;
  total_students: number;
  total_teachers: number;
  total_parents: number;
  total_admins: number;
  total_users: number;
  active_users_30d: number;
  recent_users_7d: number;
  total_capacity: number | null;
  capacity_utilization_percent: number;
}

interface ApplicationStats {
  total_schools: number;
  active_schools: number;
  total_students: number;
  total_teachers: number;
  total_parents: number;
  total_users: number;
  total_capacity: number;
  avg_capacity_utilization: number;
  schools_by_type: Record<string, number>;
  schools_by_status: Record<string, number>;
}

interface DashboardStats {
  applicationStats: ApplicationStats;
  recentSchools: School[];
  topSchools: SchoolAnalytics[];
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  // Optimized queries with better caching for performance
  const { data: appStats, isLoading: statsLoading } = useQuery({
    queryKey: ['application-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_application_stats');
      if (error) throw error;
      return data as ApplicationStats;
    },
    enabled: user?.role === 'super_admin',
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes (materialized view is fast)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: recentSchools } = useQuery({
    queryKey: ['recent-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, logo_url, school_type, enabled_features, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as School[];
    },
    enabled: user?.role === 'super_admin',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (static data)
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
  });

  const { data: topSchools } = useQuery({
    queryKey: ['top-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_analytics')
        .select('school_id, school_name, total_students, total_teachers, total_users')
        .order('total_users', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as SchoolAnalytics[];
    },
    enabled: user?.role === 'super_admin',
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (materialized view)
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
    refetchOnWindowFocus: false,
  });

  // Combined stats for backward compatibility with default values
  const stats = {
    applicationStats: appStats || {
      total_schools: 0,
      active_schools: 0,
      total_students: 0,
      total_teachers: 0,
      total_parents: 0,
      total_users: 0,
      total_capacity: 0,
      avg_capacity_utilization: 0,
      schools_by_type: {},
      schools_by_status: {},
    },
    recentSchools: recentSchools || [],
    topSchools: topSchools || [],
  };

  const getEnabledFeaturesCount = (features: Record<string, boolean>) => {
    return Object.values(features).filter(Boolean).length;
  };

  const getTotalFeatures = (features: Record<string, boolean>) => {
    return Object.keys(features).length;
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
        </motion.div>
      </div>
    );
  }

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
                <h1 className="text-xl font-semibold text-foreground">Super Admin Portal</h1>
                <p className="text-sm text-muted-foreground">Enterprise School Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="text-destructive hover:text-destructive btn-visible"
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
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{appStats?.total_schools || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {appStats?.active_schools || 0} active
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-bl-3xl" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(appStats?.total_students || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Across all schools
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-bl-3xl" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(appStats?.total_teachers || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Teaching staff
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-bl-3xl" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Utilization</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(appStats?.avg_capacity_utilization || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average capacity used
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-bl-3xl" />
            </Card>
          </motion.div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5" />
                  <span>Schools by Type</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appStats?.schools_by_type && Object.entries(appStats.schools_by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ 
                              width: `${((count as number) / (appStats.total_schools || 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Platform Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Schools</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      {appStats?.active_schools || 0} / {appStats?.total_schools || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Users</span>
                    <span className="font-medium">{(appStats?.total_users || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Capacity</span>
                    <span className="font-medium">{(appStats?.total_capacity || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>User Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Students</span>
                    <span className="font-medium">{(appStats?.total_students || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Teachers</span>
                    <span className="font-medium">{(appStats?.total_teachers || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Parents</span>
                    <span className="font-medium">{(appStats?.total_parents || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* School Performance & Recent Schools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Schools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Top Schools by Users</span>
                    </CardTitle>
                    <CardDescription>
                      Schools with the highest user engagement
                    </CardDescription>
                  </div>
                  <Link href="/super-admin/schools">
                    <Button variant="outline" size="sm" className="btn-outline-visible">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topSchools?.map((school, index) => (
                    <motion.div
                      key={school.school_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{school.school_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {school.total_students} students • {school.total_teachers} teachers
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{school.total_users} users</div>
                        {school.capacity_utilization_percent > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {school.capacity_utilization_percent}% capacity
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Schools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Recent Schools</span>
                    </CardTitle>
                    <CardDescription>
                      Latest schools added to the platform
                    </CardDescription>
                  </div>
                  <Link href="/super-admin/schools">
                    <Button variant="outline" size="sm" className="btn-outline-visible">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentSchools?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <School2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No schools found</p>
                      <p className="text-sm">Create your first school to get started</p>
                    </div>
                  ) : (
                    stats?.recentSchools?.map((school, index) => (
                    <motion.div
                      key={school.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 + index * 0.1 }}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 relative">
                          {school.logo_url ? (
                            <img 
                              src={school.logo_url} 
                              alt={`${school.name} logo`}
                              className="w-full h-full object-cover rounded-lg border"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-primary/10 rounded-lg flex items-center justify-center ${school.logo_url ? 'hidden' : ''}`}>
                            <School2 className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{school.name}</h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <Globe className="w-3 h-3" />
                              <span>{school.domain || 'No domain'}</span>
                            </span>
                            {school.school_type && (
                              <Badge variant="outline" className="text-xs">
                                {school.school_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={school.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {school.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {getEnabledFeaturesCount(school.enabled_features)}/{getTotalFeatures(school.enabled_features)} features
                        </div>
                        <Link href={`/super-admin/${school.id}`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  )))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Getting Started or Quick Actions */}
        {(appStats?.total_schools || 0) === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Welcome to the School ERP System! Start by adding your first school.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Quick Setup</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a school, add administrators, and start managing students, teachers, and classes.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href="/super-admin/schools">
                      <Button className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First School
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/super-admin/schools">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2 btn-outline-visible">
                    <School2 className="w-6 h-6" />
                    <span>Manage Schools</span>
                  </Button>
                </Link>
                <Link href="/super-admin/audit-logs">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2 btn-outline-visible">
                    <Database className="w-6 h-6" />
                    <span>Audit Logs</span>
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 btn-outline-visible" disabled>
                  <Settings className="w-6 h-6" />
                  <span>System Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        )}
      </div>
    </div>
  );
} 