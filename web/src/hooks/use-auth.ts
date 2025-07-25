'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
// Import types directly for now - will be fixed when we wire up the common package
type UserRole = "super_admin" | "school_admin" | "teacher" | "parent" | "student";

interface User {
  id: string;
  email: string;
  role: UserRole;
  school_id: string | null;
  created_at: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  employee_id?: string;
  subjects?: string[];
  relation?: string;
  avatar_url?: string;
}

export function useAuth() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      try {
        // First check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          return null;
        }
        
        if (!session?.user) {
          return null;
        }

        // Get user details from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('User data error:', userError);
          return null;
        }

        if (!userData) {
          return null;
        }

        return userData as User;
      } catch (err) {
        console.error('Auth query error:', err);
        return null;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        return false;
      }
      
      // Force reload to clear all state
      window.location.href = '/login';
      return true;
    } catch (err) {
      console.error('Sign out error:', err);
      return false;
    }
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    signOut,
  };
} 