'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  GraduationCap, 
  UserCheck, 
  Users, 
  Building2, 
  Settings,
  TrendingUp,
  Calendar,
  BookOpen
} from 'lucide-react';

interface StatsCard {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

export default function SchoolAdminDashboard() {
  const { user } = useAuth();

  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) throw new Error('No school ID');

      // Get student count
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id);

      // Get teacher count
      const { count: teacherCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id)
        .eq('role', 'teacher');

      // Get parent count
      const { count: parentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id)
        .eq('role', 'parent');

      // Get school info for features
      const { data: schoolData } = await supabase
        .from('schools')
        .select('enabled_features')
        .eq('id', user.school_id)
        .single();

      const enabledFeaturesCount = schoolData?.enabled_features 
        ? Object.values(schoolData.enabled_features).filter(Boolean).length 
        : 0;

      return {
        students: studentCount || 0,
        teachers: teacherCount || 0,
        parents: parentCount || 0,
        features: enabledFeaturesCount,
      };
    },
    enabled: !!user?.school_id,
  });

  // Get recent activity
  const { data: recentStudents } = useQuery({
    queryKey: ['recent-students', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data } = await supabase
        .from('students')
        .select('full_name, grade, section, created_at')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!user?.school_id,
  });

  const statsCards: StatsCard[] = [
    {
      title: 'Total Students',
      value: stats?.students || 0,
      icon: GraduationCap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Teachers', 
      value: stats?.teachers || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Parents',
      value: stats?.parents || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Active Features',
      value: stats?.features || 0,
      icon: Settings,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening at your school.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <GraduationCap className="w-8 h-8 text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Add Student</p>
                <p className="text-sm text-gray-500">Register new student</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <UserCheck className="w-8 h-8 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Add Teacher</p>
                <p className="text-sm text-gray-500">Invite new teacher</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="w-8 h-8 text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Add Parent</p>
                <p className="text-sm text-gray-500">Register new parent</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Building2 className="w-8 h-8 text-orange-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Add Class</p>
                <p className="text-sm text-gray-500">Create new class</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Students</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentStudents?.length ? (
              recentStudents.map((student, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {student.grade} - Section {student.section}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(student.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent students added</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">School Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Student Management</h4>
            <p className="text-sm text-gray-600 mt-1">
              Manage student enrollment, profiles, and academic records
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Teacher Portal</h4>
            <p className="text-sm text-gray-600 mt-1">
              Coordinate with teaching staff and manage assignments
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Parent Engagement</h4>
            <p className="text-sm text-gray-600 mt-1">
              Keep parents informed about their children's progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 