import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { QueryProvider } from './src/contexts/QueryProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}
