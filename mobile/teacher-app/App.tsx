import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { QueryProvider } from './src/providers/QueryProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Slot } from 'expo-router';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <Slot />
          </AuthProvider>
        </QueryProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
