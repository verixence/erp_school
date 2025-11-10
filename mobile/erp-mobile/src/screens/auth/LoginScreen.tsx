import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Button, TextInput, Card, Provider as PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const [loginId, setLoginId] = useState(''); // Auto-detects email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ loginId?: string; password?: string }>({});

  const { signIn, signInWithUsername } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Auto-detect if input is email or username
  const isEmail = (input: string): boolean => {
    // Check if it contains @ AND looks like a valid email structure
    return input.includes('@') && input.includes('.');
  };

  const validateForm = (): boolean => {
    const newErrors: { loginId?: string; password?: string } = {};

    if (!loginId.trim()) {
      newErrors.loginId = 'Email or username is required';
    } else if (isEmail(loginId) && !validateEmail(loginId)) {
      newErrors.loginId = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let result;
      // Auto-detect and use appropriate login method
      if (isEmail(loginId)) {
        console.log('Attempting email login with:', loginId);
        result = await signIn(loginId, password);
      } else {
        console.log('Attempting username login with:', loginId);
        result = await signInWithUsername(loginId, password);
      }

      console.log('Login result:', result);

      if (result.error) {
        console.error('Login error:', result.error);
        // Show more detailed error message
        const errorMessage = result.error?.message || 'Invalid username or password. Please try again.';
        Alert.alert('Login Failed', errorMessage);
      } else {
        console.log('Login successful');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = loginId.trim() && password && password.length >= 6;

  return (
    <PaperProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#E8D5FF', '#F8BBD9', '#FFB4D1']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ 
                flexGrow: 1, 
                paddingHorizontal: 24,
                paddingVertical: 40,
                justifyContent: 'center'
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Logo and Header Section */}
              <View
                style={{ alignItems: 'center', marginBottom: 48 }}
              >
                <View style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.2,
                  shadowRadius: 20,
                  elevation: 15,
                }}>
                  <Image
                    source={require('../../../assets/icon.png')}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                    }}
                    resizeMode="contain"
                  />
                </View>
                
                <Text style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: '#4A5568',
                  textAlign: 'center',
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}>
                  Campus Hoster
                </Text>
                
                <Text style={{
                  fontSize: 18,
                  color: '#6B46C1',
                  textAlign: 'center',
                  marginBottom: 8,
                  fontWeight: '600',
                }}>
                  Smart Education Management
                </Text>
                
                <Text style={{
                  fontSize: 16,
                  color: '#718096',
                  textAlign: 'center',
                  lineHeight: 24,
                  maxWidth: width * 0.8,
                }}>
                  Connecting teachers and parents{'\n'}for better learning outcomes
                </Text>
              </View>

              {/* Login Form */}
              <View>
                <Card style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: 24,
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  paddingVertical: 32,
                  paddingHorizontal: 24,
                }}>
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: '#2D3748',
                      textAlign: 'center',
                      marginBottom: 8,
                    }}>
                      Welcome Back!
                    </Text>
                    <Text style={{
                      fontSize: 16,
                      color: '#718096',
                      textAlign: 'center',
                    }}>
                      Sign in with email or username
                    </Text>
                  </View>

                  {/* Login ID Input - Auto-detects email or username */}
                  <View style={{ marginBottom: 20 }}>
                    <TextInput
                      label="Email or Username"
                      placeholder="Enter your email or username"
                      value={loginId}
                      onChangeText={(text) => {
                        setLoginId(text);
                        if (errors.loginId) {
                          setErrors(prev => ({ ...prev, loginId: undefined }));
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      left={<TextInput.Icon icon={isEmail(loginId) ? 'email' : 'account'} color="#6366F1" />}
                      mode="outlined"
                      error={!!errors.loginId}
                      textColor="#1F2937"
                      placeholderTextColor="#9CA3AF"
                      style={{
                        backgroundColor: 'white',
                      }}
                      theme={{
                        colors: {
                          primary: '#6366F1',
                          outline: errors.loginId ? '#E53E3E' : '#E2E8F0',
                          text: '#1F2937',
                          placeholder: '#9CA3AF',
                        }
                      }}
                      accessibilityLabel="Email or username input field"
                      accessibilityHint="Enter your email address or username to log in"
                    />
                    {errors.loginId && (
                      <Text style={{
                        color: '#E53E3E',
                        fontSize: 12,
                        marginTop: 4,
                        marginLeft: 12,
                      }}>
                        {errors.loginId}
                      </Text>
                    )}
                    {/* Helper text showing auto-detection */}
                    {loginId.trim() && !errors.loginId && (
                      <Text style={{
                        color: '#6366F1',
                        fontSize: 11,
                        marginTop: 4,
                        marginLeft: 12,
                        fontStyle: 'italic',
                      }}>
                        {isEmail(loginId) ? '✓ Using email login' : '✓ Using username login'}
                      </Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View style={{ marginBottom: 32 }}>
                    <TextInput
                      label="Password"
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: undefined }));
                        }
                      }}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      left={<TextInput.Icon icon="lock" color="#6366F1" />}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? "eye-off" : "eye"}
                          onPress={() => setShowPassword(!showPassword)}
                          color="#6366F1"
                        />
                      }
                      mode="outlined"
                      error={!!errors.password}
                      textColor="#1F2937"
                      placeholderTextColor="#9CA3AF"
                      style={{
                        backgroundColor: 'white',
                      }}
                      theme={{
                        colors: {
                          primary: '#6366F1',
                          outline: errors.password ? '#E53E3E' : '#E2E8F0',
                          text: '#1F2937',
                          placeholder: '#9CA3AF',
                        }
                      }}
                      accessibilityLabel="Password input field"
                      accessibilityHint="Enter your password to log in"
                    />
                    {errors.password && (
                      <Text style={{
                        color: '#E53E3E',
                        fontSize: 12,
                        marginTop: 4,
                        marginLeft: 12,
                      }}>
                        {errors.password}
                      </Text>
                    )}
                  </View>

                  {/* Sign In Button */}
                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={loading}
                    disabled={!isFormValid || loading}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 6,
                      backgroundColor: isFormValid ? '#6366F1' : '#CBD5E0',
                    }}
                    labelStyle={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: 'white',
                    }}
                    accessibilityLabel="Sign in button"
                    accessibilityHint="Tap to sign in to your account"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </Card>
              </View>

              {/* Footer */}
              <View
                style={{
                  alignItems: 'center',
                  marginTop: 40,
                  paddingBottom: 20
                }}
              >
                {/* Made in India Badge */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                  <Text style={{
                    fontSize: 20,
                    marginRight: 8,
                  }}>
                    🇮🇳
                  </Text>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#2D3748',
                    letterSpacing: 0.5,
                  }}>
                    Made in India
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => Linking.openURL('https://www.verixence.com')}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 14,
                    color: '#6366F1',
                    textAlign: 'center',
                    textDecorationLine: 'underline',
                  }}>
                    Developed by verixence.com
                  </Text>
                </TouchableOpacity>
                <Text style={{
                  fontSize: 12,
                  color: '#A0AEC0',
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                  Version 1.0.0 • Built with ❤️ for education
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    </PaperProvider>
  );
};