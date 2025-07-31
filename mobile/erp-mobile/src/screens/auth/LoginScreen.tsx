import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Shield, 
  Eye, 
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Heart,
  Star
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [fadeAnim] = useState(new Animated.Value(0));

  const { signIn } = useAuth();

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
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

  const roleFeatures = [
    {
      role: 'Teachers',
      icon: GraduationCap,
      color: '#3b82f6',
      features: ['Attendance Management', 'Homework Creation', 'Grade Entry', 'Student Analytics']
    },
    {
      role: 'Parents',
      icon: Heart,
      color: '#10b981',
      features: ['Child Progress Tracking', 'Attendance Monitoring', 'Homework Review', 'Communication']
    },
    {
      role: 'Students',
      icon: BookOpen,
      color: '#8b5cf6',
      features: ['Assignment Submission', 'Grade Viewing', 'Timetable Access', 'Announcements']
    }
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={{ 
                flex: 1, 
                paddingHorizontal: 24, 
                paddingTop: 60,
                opacity: fadeAnim 
              }}
            >
              {/* Hero Section */}
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: 50, 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10
                }}>
                  <GraduationCap size={50} color="white" />
                </View>
                
                <Text style={{ 
                  fontSize: 36, 
                  fontWeight: 'bold', 
                  color: 'white', 
                  textAlign: 'center',
                  marginBottom: 8
                }}>
                  ERP School
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Sparkles size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={{ 
                    fontSize: 18, 
                    color: 'rgba(255,255,255,0.9)', 
                    textAlign: 'center',
                    marginHorizontal: 8
                  }}>
                    Smart Education Management
                  </Text>
                  <Sparkles size={16} color="rgba(255,255,255,0.8)" />
                </View>
                
                <Text style={{ 
                  fontSize: 16, 
                  color: 'rgba(255,255,255,0.8)', 
                  textAlign: 'center',
                  lineHeight: 24
                }}>
                  Connecting teachers, parents, and students{'\n'}for better learning outcomes
                </Text>
              </View>

              {/* Login Form */}
              <Card style={{ 
                marginBottom: 32,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.1,
                shadowRadius: 40,
                elevation: 20
              }}>
                <CardContent style={{ padding: 24 }}>
                  <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      color: '#111827',
                      marginBottom: 8
                    }}>
                      Welcome Back!
                    </Text>
                    <Text style={{ 
                      fontSize: 16, 
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      Sign in to access your portal
                    </Text>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Input
                      placeholder="Email address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}

                      error={errors.email}
                    />
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Input
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}

                      
                      error={errors.password}
                    />
                  </View>

                  <Button
                    title={loading ? "Signing in..." : "Sign In"}
                    onPress={handleLogin}
                    loading={loading}
                    style={{ 
                      height: 56,
                      borderRadius: 16,
                      backgroundColor: '#667eea'
                    }}

                  />

                  <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#667eea', fontSize: 16 }}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </CardContent>
              </Card>

              {/* Role Features */}
              <View style={{ marginBottom: 40 }}>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: 'white',
                  textAlign: 'center',
                  marginBottom: 20
                }}>
                  Designed for Everyone
                </Text>
                
                {roleFeatures.map((roleData, index) => (
                  <View key={index} style={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 20,
                        backgroundColor: roleData.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <roleData.icon size={20} color="white" />
                      </View>
                      <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: 'white'
                      }}>
                        {roleData.role}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {roleData.features.map((feature, featureIndex) => (
                        <View key={featureIndex} style={{ 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          marginRight: 8,
                          marginBottom: 8
                        }}>
                          <Text style={{ 
                            fontSize: 12, 
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: '500'
                          }}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={{ alignItems: 'center', paddingBottom: 40 }}>
                <Text style={{ 
                  fontSize: 14, 
                  color: 'rgba(255,255,255,0.7)',
                  textAlign: 'center'
                }}>
                  Powered by ERP School Platform
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  marginTop: 4
                }}>
                  Version 1.0.0 • Built with ❤️ for education
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}; 