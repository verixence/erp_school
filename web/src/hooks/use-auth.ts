'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState & {
  signOut: () => Promise<boolean>;
} {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth'],
    queryFn: async (): Promise<User | null> => {
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

        // Get user details from our users table with retry logic
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (userError) {
              if (retryCount === maxRetries) {
                console.error('User data error after retries:', userError);
                return null;
              }
              retryCount++;
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }

            if (!userData) {
              console.warn('User data not found in database');
              return null;
            }

            return userData as User;
          } catch (retryError) {
            console.error(`Auth retry ${retryCount} failed:`, retryError);
            if (retryCount === maxRetries) {
              return null;
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        return null;
      } catch (err) {
        console.error('Auth query error:', err);
        return null;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    retryDelay: 1000,
  });

  const signOut = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        return false;
      }
      
      // Use Next.js router for better navigation
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return true;
    } catch (err) {
      console.error('Sign out error:', err);
      return false;
    }
  };

  return {
    user: user || null,
    isLoading,
    error,
    isAuthenticated: !!user,
    signOut,
  };
} 