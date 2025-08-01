import React, { useState, useEffect } from 'react';
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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  FadeInDown,
  FadeInUp 
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn } = useAuth();

  // Animation values
  const logoScale = useSharedValue(0);
  const formOpacity = useSharedValue(0);

  useEffect(() => {
    // Start animations on component mount
    logoScale.value = withSpring(1, { duration: 800 });
    formOpacity.value = withTiming(1, { duration: 1000 });
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
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
      const { error } = await signIn(email, password);
      
      if (error) {
        Alert.alert('Login Failed', error.message || 'An error occurred during login');
      }
    } catch (error) {
      Alert.alert('Login Failed', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() && password && validateEmail(email) && password.length >= 6;

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
              <Animated.View 
                entering={FadeInUp.delay(200).duration(800)}
                style={[{ alignItems: 'center', marginBottom: 48 }, logoAnimatedStyle]}
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
              </Animated.View>

              {/* Login Form */}
              <Animated.View 
                entering={FadeInDown.delay(400).duration(800)}
                style={formAnimatedStyle}
              >
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
                  <View style={{ marginBottom: 32 }}>
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
                      Sign in to access your account
                    </Text>
                  </View>

                  {/* Email Input */}
                  <View style={{ marginBottom: 20 }}>
                    <TextInput
                      label="Email"
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      left={<TextInput.Icon icon="email" />}
                      mode="outlined"
                      error={!!errors.email}
                      style={{
                        backgroundColor: 'white',
                      }}
                      theme={{
                        colors: {
                          primary: '#6B46C1',
                          outline: errors.email ? '#E53E3E' : '#E2E8F0',
                        }
                      }}
                      accessibilityLabel="Email input field"
                      accessibilityHint="Enter your email address to log in"
                    />
                    {errors.email && (
                      <Text style={{
                        color: '#E53E3E',
                        fontSize: 12,
                        marginTop: 4,
                        marginLeft: 12,
                      }}>
                        {errors.email}
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
                      left={<TextInput.Icon icon="lock" />}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? "eye-off" : "eye"}
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                      mode="outlined"
                      error={!!errors.password}
                      style={{
                        backgroundColor: 'white',
                      }}
                      theme={{
                        colors: {
                          primary: '#6B46C1',
                          outline: errors.password ? '#E53E3E' : '#E2E8F0',
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
                      backgroundColor: isFormValid ? '#6B46C1' : '#CBD5E0',
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
              </Animated.View>

              {/* Footer */}
              <Animated.View 
                entering={FadeInUp.delay(600).duration(800)}
                style={{ 
                  alignItems: 'center', 
                  marginTop: 40,
                  paddingBottom: 20 
                }}
              >
                <TouchableOpacity 
                  onPress={() => Linking.openURL('https://www.verixence.com')}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 14,
                    color: '#6B46C1',
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
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    </PaperProvider>
  );
};