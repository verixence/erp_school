import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser } from '../services/supabase';
import { 
  registerForPushNotificationsAsync, 
  storePushToken,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener
} from '../services/notifications';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isTeacher: boolean;
  isParent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (authUser: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          school_id,
          phone
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return profile as User;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const setupPushNotifications = async (user: User) => {
    try {
      // Temporarily disabled to isolate login issues
      console.log('Push notifications setup disabled for debugging');
      // const token = await registerForPushNotificationsAsync();
      // if (token && user.id) {
      //   await storePushToken(user.id, token, user.role);
      // }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user);
        if (profile) {
          setUser(profile);
          // Set up push notifications after successful login
          await setupPushNotifications(profile);
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    // Set up notification listeners - temporarily disabled
    // const notificationListener = addNotificationReceivedListener(notification => {
    //   console.log('Notification received:', notification);
    //   // Handle foreground notifications here
    // });

    // const responseListener = addNotificationResponseReceivedListener(response => {
    //   console.log('Notification response:', response);
    //   // Handle notification taps here
    //   // You can navigate to specific screens based on notification data
    // });

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          if (profile) {
            setUser(profile);
            // Set up push notifications for existing session
            await setupPushNotifications(profile);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user);
          if (profile) {
            setUser(profile);
            await setupPushNotifications(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      // notificationListener.remove();
      // responseListener.remove();
    };
  }, []);

  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isTeacher,
    isParent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 