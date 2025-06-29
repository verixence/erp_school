import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
}

interface KPICardProps {
  title: string;
  value: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  onPress?: () => void;
}

function KPICard({ title, value, icon, color, onPress }: KPICardProps) {
  return (
    <TouchableOpacity 
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 m-2 flex-1"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
          <Text className="text-sm text-gray-600 mt-1">{title}</Text>
        </View>
        <View className={`p-3 rounded-full ${color}`}>
          <MaterialIcons name={icon} size={24} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  onPress: () => void;
}

function QuickAction({ title, description, icon, color, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity 
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center mb-3">
        <View className={`p-3 rounded-full mr-4 ${color}`}>
          <MaterialIcons name={icon} size={24} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          <Text className="text-gray-600 text-sm">{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', session.user.id)
            .single();
          
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  // Teacher dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['teacher-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
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

        // Get sections count using section_teachers table
        const { count: sectionsCount } = await supabase
          .from('section_teachers')
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
      } catch (error) {
        console.error('Error fetching stats:', error);
        return {
          todaysClasses: 0,
          pendingHomework: 0,
          sectionsCount: 0,
          recentAnnouncements: 0,
        };
      }
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white shadow-sm">
        <View className="px-4 py-4 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <MaterialIcons name="school" size={32} color="#4F46E5" />
            <Text className="text-xl font-semibold text-gray-900 ml-3">Teacher Portal</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View className="px-4 pb-4">
          <Text className="text-sm text-gray-600">Welcome, {user?.email}</Text>
        </View>
      </View>

      <View className="p-4">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Dashboard</Text>
          <Text className="text-gray-600">Overview of your teaching activities</Text>
        </View>

        {/* KPI Cards */}
        <View className="flex-row flex-wrap mb-6">
          <View className="w-1/2">
            <KPICard
              title="Today's Classes"
              value={stats?.todaysClasses || 0}
              icon="event"
              color="bg-blue-500"
              onPress={() => router.push('/timetable')}
            />
          </View>
          <View className="w-1/2">
            <KPICard
              title="Pending Homework"
              value={stats?.pendingHomework || 0}
              icon="assignment"
              color="bg-green-500"
              onPress={() => router.push('/homework')}
            />
          </View>
          <View className="w-1/2">
            <KPICard
              title="My Sections"
              value={stats?.sectionsCount || 0}
              icon="group"
              color="bg-purple-500"
            />
          </View>
          <View className="w-1/2">
            <KPICard
              title="Announcements"
              value={stats?.recentAnnouncements || 0}
              icon="announcement"
              color="bg-orange-500"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</Text>
          
          <QuickAction
            title="Mark Attendance"
            description="Record student attendance for today"
            icon="check-circle"
            color="bg-blue-500"
            onPress={() => router.push('/attendance')}
          />
          
          <QuickAction
            title="Assign Homework"
            description="Create new homework assignments"
            icon="assignment"
            color="bg-green-500"
            onPress={() => router.push('/homework')}
          />
          
          <QuickAction
            title="View Timetable"
            description="Check your class schedule"
            icon="schedule"
            color="bg-purple-500"
            onPress={() => router.push('/timetable')}
          />
        </View>
      </View>
    </ScrollView>
  );
}
