import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const LoadingScreen: React.FC = () => {
  return (
    <LinearGradient
      colors={['#3b82f6', '#1d4ed8', '#1e40af']}
      className="flex-1 justify-center items-center"
    >
      <View className="items-center">
        <View className="bg-white/20 rounded-full p-6 mb-6">
          <Text className="text-4xl">🎓</Text>
        </View>
        <Text className="text-2xl font-bold text-white mb-4">
          ERP School
        </Text>
        <ActivityIndicator size="large" color="white" />
        <Text className="text-blue-100 mt-4">
          Loading your portal...
        </Text>
      </View>
    </LinearGradient>
  );
}; 