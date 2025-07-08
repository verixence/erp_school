import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '../src/providers/QueryProvider';
import { AuthProvider } from '../src/contexts/AuthContext';

// Import polyfills
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryProvider>
          <AuthProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </QueryProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 