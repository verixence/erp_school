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
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion } from 'framer-motion';

interface School {
  id: string;
  name: string;
  domain: string | null;
  enabled_features: Record<string, boolean>;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  avgFeatures: number;
  recentSchools: School[];
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch schools data
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (schoolsError) throw schoolsError;

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Calculate stats
      const totalSchools = schools?.length || 0;
      const activeSchools = schools?.filter(s => s.status === 'active').length || 0;
      const avgFeatures = totalSchools > 0 
        ? Math.round(schools.reduce((acc, school) => 
            acc + Object.values(school.enabled_features).filter(Boolean).length, 0
          ) / totalSchools)
        : 0;

      return {
        totalSchools,
        activeSchools,
        totalUsers: usersCount || 0,
        avgFeatures,
        recentSchools: schools?.slice(0, 5) || [],
      };
    },
    enabled: user?.role === 'super_admin',
  });

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <School2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSchools || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Schools registered
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
                <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeSchools || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalSchools ? Math.round((stats.activeSchools / stats.totalSchools) * 100) : 0}% active
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
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all schools
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
                <CardTitle className="text-sm font-medium">Avg Features</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.avgFeatures || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Per school average
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Getting Started Card (shown when <= 3 schools) or Recent Schools */}
        {(stats?.totalSchools || 0) <= 3 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
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
          /* Recent Schools */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Schools</CardTitle>
                    <CardDescription>
                      Latest schools added to the platform
                    </CardDescription>
                  </div>
                  <Link href="/super-admin/schools">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentSchools.map((school, index) => (
                    <motion.div
                      key={school.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <School2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{school.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {school.domain || 'No domain set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={school.status === 'active' ? 'default' : 'secondary'}>
                          {school.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {getEnabledFeaturesCount(school.enabled_features)}/{getTotalFeatures(school.enabled_features)} features
                        </div>
                        <Link href={`/super-admin/${school.id}`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <School2 className="w-6 h-6" />
                    <span>Manage Schools</span>
                  </Button>
                </Link>
                <Link href="/super-admin/audit-logs">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Database className="w-6 h-6" />
                    <span>Audit Logs</span>
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2" disabled>
                  <Settings className="w-6 h-6" />
                  <span>System Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 