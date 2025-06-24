import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useTeacherDashboardStats } from '@erp/common';
import { router } from 'expo-router';

interface StatCardProps {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

function StatCard({ title, value, icon, color, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 shadow-sm flex-1 mx-1"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
          <Text className="text-sm text-gray-600 mt-1">{title}</Text>
        </View>
        <View className={`p-3 rounded-full ${color}`}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const { data: authData } = useAuth();
  const user = authData?.user;
  
  const { data: stats } = useTeacherDashboardStats(user?.id, user?.school_id);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back!
        </Text>
        <Text className="text-gray-600 mb-6">{user?.email}</Text>

        {/* KPI Cards */}
        <View className="flex-row mb-6">
          <StatCard
            title="Today's Classes"
            value={stats?.todaysClasses || 0}
            icon="calendar"
            color="bg-blue-500"
            onPress={() => router.push('/(tabs)/timetable')}
          />
          <StatCard
            title="Pending Homework"
            value={stats?.pendingHomework || 0}
            icon="book"
            color="bg-green-500"
            onPress={() => router.push('/(tabs)/homework')}
          />
        </View>

        <View className="flex-row mb-6">
          <StatCard
            title="My Sections"
            value={stats?.sectionsCount || 0}
            icon="people"
            color="bg-purple-500"
          />
          <View className="flex-1 mx-1" />
        </View>

        {/* Quick Actions */}
        <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</Text>
        
        <View className="space-y-3">
          <TouchableOpacity
            className="bg-white rounded-lg p-4 shadow-sm flex-row items-center"
            onPress={() => router.push('/(tabs)/attendance')}
          >
            <View className="bg-blue-100 p-3 rounded-full mr-4">
              <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-medium text-gray-900">Mark Attendance</Text>
              <Text className="text-gray-600">Record student attendance for today</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-lg p-4 shadow-sm flex-row items-center"
            onPress={() => router.push('/(tabs)/homework')}
          >
            <View className="bg-green-100 p-3 rounded-full mr-4">
              <Ionicons name="add-circle" size={24} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-medium text-gray-900">Assign Homework</Text>
              <Text className="text-gray-600">Create new homework assignments</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-lg p-4 shadow-sm flex-row items-center"
            onPress={() => router.push('/(tabs)/timetable')}
          >
            <View className="bg-purple-100 p-3 rounded-full mr-4">
              <Ionicons name="calendar" size={24} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-medium text-gray-900">View Timetable</Text>
              <Text className="text-gray-600">Check your class schedule</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
} 