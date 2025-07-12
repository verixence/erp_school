import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Title } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();

  // Add debugging
  useEffect(() => {
    console.log('Index - Auth loading:', isLoading);
    console.log('Index - User:', user ? 'Authenticated' : 'Not authenticated');
    console.log('Index - User role:', user?.role);
  }, [user, isLoading]);

  // Proper auth-based navigation
  useEffect(() => {
    console.log('Index - Navigation effect triggered');
    if (!isLoading) {
      console.log('Index - Not loading, checking user...');
      if (user && user.role === 'parent') {
        console.log('Index - Navigating to dashboard');
        router.replace('/(tabs)/dashboard');
      } else {
        console.log('Index - Navigating to login');
        router.replace('/login');
      }
    }
  }, [user, isLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator animating size="large" color="#2563eb" />
        <Title style={styles.title}>CampusHoster</Title>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
}); 