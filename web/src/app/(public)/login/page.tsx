'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Mail, Lock, Loader2, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else if (data.user) {
        // Check if user exists in our database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role, email')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          setMessage('User not found in the system. Please contact an administrator.');
          return;
        }

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
    } catch (error) {
      setMessage('An error occurred. Please try again.');
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              message.includes('Check your email') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Demo Account */}
          <div className="border-t pt-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-3">🚀 Demo Credentials</h3>
              <div className="space-y-3">
                                  <div className="bg-white px-3 py-2 rounded border border-blue-300">
                  <p className="text-xs text-blue-600 font-medium mb-1">School Admin:</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-blue-800">admin@campus.cx</code>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('admin@campus.cx');
                        setPassword('Welcome!23');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Use
                    </button>
                  </div>
                  <code className="text-sm font-mono text-blue-800">Password: Welcome!23</code>
                </div>
                                  <div className="bg-white px-3 py-2 rounded border border-blue-300">
                  <p className="text-xs text-blue-600 font-medium mb-1">Teacher:</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-blue-800">sai.kapoor22@yopmail.com</code>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('sai.kapoor22@yopmail.com');
                        setPassword('Welcome!23');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Use
                    </button>
                  </div>
                  <code className="text-sm font-mono text-blue-800">Password: Welcome!23</code>
                </div>
                                  <div className="bg-white px-3 py-2 rounded border border-blue-300">
                  <p className="text-xs text-blue-600 font-medium mb-1">Parent:</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-blue-800">aarav.gupta0@yopmail.com</code>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('aarav.gupta0@yopmail.com');
                        setPassword('Welcome!23');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Use
                    </button>
                  </div>
                  <code className="text-sm font-mono text-blue-800">Password: Welcome!23</code>
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