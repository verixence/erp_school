import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@erp/common';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <Text className="text-3xl font-bold text-center mb-8">Teacher Portal</Text>
      <TextInput
        className="border p-3 mb-4 rounded"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        className="border p-3 mb-4 rounded"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        className="bg-blue-600 p-4 rounded"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold">
          {loading ? 'Loading...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
