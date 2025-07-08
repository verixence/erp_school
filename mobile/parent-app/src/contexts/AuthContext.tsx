import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile extends User {
  role?: string;
  school_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext - Initializing...');
    
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('AuthContext - Error getting session:', error);
          setSession(null);
          setUser(null);
        } else {
          console.log('AuthContext - Initial session:', session ? 'Found' : 'Not found');
          setSession(session);
          
          if (session?.user) {
            await handleUserSession(session.user);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('AuthContext - Exception getting session:', error);
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          console.log('AuthContext - Setting loading to false');
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('AuthContext - Auth state changed:', event, session ? 'Session exists' : 'No session');
        setSession(session);
        
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (authUser: User) => {
    console.log('AuthContext - Handling user session for:', authUser.id);
    
    try {
      // Try to fetch user profile with a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error && error.message !== 'Timeout') {
        console.log('AuthContext - Error fetching profile (using fallback):', error.message);
        // Use session data with default values
        setUser({
          ...authUser,
          role: 'parent',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Parent',
        } as UserProfile);
      } else if (error && error.message === 'Timeout') {
        console.log('AuthContext - Profile fetch timeout (using fallback)');
        // Use session data with default values
        setUser({
          ...authUser,
          role: 'parent',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Parent',
        } as UserProfile);
      } else {
        console.log('AuthContext - Profile fetched successfully');
        setUser({
          ...authUser,
          ...data,
        } as UserProfile);
      }
    } catch (error) {
      console.log('AuthContext - Exception fetching profile (using fallback):', error);
      // Fallback to session data
      setUser({
        ...authUser,
        role: 'parent',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Parent',
      } as UserProfile);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext - Signing in user:', email);
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } finally {
      // Don't set loading to false here as the auth state change will handle it
    }
  };

  const signOut = async () => {
    console.log('AuthContext - Signing out user');
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 