import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('sampath.sfmc@gmail.com');
  const [password, setPassword] = useState('Mundrathi!23');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (userData?.role === 'teacher') {
          router.replace('/(tabs)/dashboard');
        } else {
          Alert.alert('Error', 'Access denied. Teachers only.');
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-3xl font-bold text-center mb-8 text-blue-600">Teacher Portal</Text>
      
      <View className="mb-6">
        <Text className="text-sm text-gray-600 mb-2">Demo Credentials:</Text>
        <Text className="text-xs text-gray-500">Email: sampath.sfmc@gmail.com</Text>
        <Text className="text-xs text-gray-500">Password: Mundrathi!23</Text>
      </View>
      
      <TextInput
        className="border border-gray-300 p-3 mb-4 rounded-lg"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="border border-gray-300 p-3 mb-6 rounded-lg"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        className="bg-blue-600 p-4 rounded-lg"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold text-lg">
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
