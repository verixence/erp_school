import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const LoadingScreen: React.FC = () => {
  return (
    <LinearGradient
      colors={['#3b82f6', '#1d4ed8', '#1e40af']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>🎓</Text>
        </View>
        <Text style={styles.title}>
          ERP School
        </Text>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.subtitle}>
          Loading your portal...
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    padding: 24,
    marginBottom: 24,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  subtitle: {
    color: '#dbeafe',
    marginTop: 16,
  },
}); 