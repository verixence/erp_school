import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@erp/common';

export default function Index() {
  const { data: authData, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (authData?.isAuthenticated && authData?.user?.role === 'teacher') {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [authData, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return null;
} 