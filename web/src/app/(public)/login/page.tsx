'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Mail, Lock, Loader2, GraduationCap, Eye, EyeOff, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loginId, setLoginId] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loginMode, setLoginMode] = useState<'username' | 'email'>('username'); // Default to username
  const router = useRouter();

  // Helper function to sign in with username
  const signInWithUsername = async (username: string, password: string) => {
    // First, find the user by username to get their email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, id, username, first_name, last_name, role, school_id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      throw new Error('Invalid username or password');
    }

    // Use the found email to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    });

    if (error) {
      throw new Error('Invalid username or password');
    }

    return { data, userData };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      let data, userData;

      if (loginMode === 'username') {
        const result = await signInWithUsername(loginId, password);
        data = result.data;
        userData = result.userData;
      } else {
        // Email login
        const authResult = await supabase.auth.signInWithPassword({
          email: loginId,
          password,
        });

        if (authResult.error) {
          setMessage(authResult.error.message);
          return;
        }

        data = authResult.data;

        // Get user data from database
        const { data: dbUserData, error: userError } = await supabase
          .from('users')
          .select('id, role, email, username, first_name, last_name')
          .eq('id', data.user?.id)
          .single();

        if (userError || !dbUserData) {
          setMessage('User not found in the system. Please contact an administrator.');
          return;
        }

        userData = dbUserData;
      }

      if (data.user && userData) {
        // Redirect based on role with force refresh
        switch (userData.role) {
          case 'super_admin':
            window.location.href = '/super-admin';
            break;
          case 'school_admin':
            window.location.href = '/school-admin';
            break;
          case 'teacher':
            window.location.href = '/teacher';
            break;
          case 'parent':
            window.location.href = '/parent';
            break;
          default:
            window.location.href = '/dashboard';
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-44 h-44 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="CampusHoster Logo" 
                className="w-40 h-40 object-contain"
              />
            </div>
            <div>
              {/* Removed h1 since logo already contains the name */}
              <p className="text-gray-600">School Management Platform</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Login Mode Toggle */}
            <div className="flex bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 border border-blue-200">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('username');
                  setLoginId('');
                  setMessage('');
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  loginMode === 'username'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <User className="w-4 h-4" />
                Username
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('email');
                  setLoginId('');
                  setMessage('');
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  loginMode === 'email'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="loginId" className="block text-sm font-semibold text-gray-700">
                {loginMode === 'email' ? 'Email Address' : 'Username'}
              </label>
              <div className="relative group">
                {loginMode === 'email' ? (
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                ) : (
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                )}
                <input
                  id="loginId"
                  type={loginMode === 'email' ? 'email' : 'text'}
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={loginMode === 'email' ? 'Enter your email address' : 'Enter your username'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg text-sm border ${
              message.includes('Check your email') 
                ? 'bg-green-50 text-green-800 border-green-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            } shadow-sm`}>
              <div className="flex items-center gap-2">
                {message.includes('Check your email') ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                )}
                {message}
              </div>
            </div>
          )}

          {/* Demo Account */}
          <div className="border-t pt-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                🚀 Demo Credentials
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                  Try Now
                </span>
              </h3>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">School Admin</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginId(loginMode === 'username' ? 'admin0004' : 'admin@campus.cx');
                        setPassword('Welcome!23');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
                    >
                      Use This
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-400" />
                      <code className="text-sm font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded">
                        {loginMode === 'username' ? 'admin0004' : 'admin@campus.cx'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <code className="text-sm font-mono text-gray-600">Welcome!23</code>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Teacher</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginId(loginMode === 'username' ? 'TCHR1022' : 'sai.kapoor22@yopmail.com');
                        setPassword('Welcome!23');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
                    >
                      Use This
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {loginMode === 'username' ? <User className="w-3 h-3 text-gray-400" /> : <Mail className="w-3 h-3 text-gray-400" />}
                      <code className="text-sm font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded">
                        {loginMode === 'username' ? 'TCHR1022' : 'sai.kapoor22@yopmail.com'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <code className="text-sm font-mono text-gray-600">Welcome!23</code>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Parent</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginId(loginMode === 'username' ? 'P0025' : 'aarav.gupta0@yopmail.com');
                        setPassword('Welcome!23');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
                    >
                      Use This
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {loginMode === 'username' ? <User className="w-3 h-3 text-gray-400" /> : <Mail className="w-3 h-3 text-gray-400" />}
                      <code className="text-sm font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded">
                        {loginMode === 'username' ? 'P0025' : 'aarav.gupta0@yopmail.com'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <code className="text-sm font-mono text-gray-600">Welcome!23</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Secure authentication with enterprise-grade security
        </p>
      </div>
    </div>
  );
} 