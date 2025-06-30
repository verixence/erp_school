import { Redirect } from 'expo-router';

export default function IndexScreen() {
  // For now, always redirect to login
  // In a real app, you'd check if user is authenticated first
  return <Redirect href="/login" />;
} 