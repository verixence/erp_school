import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Polyfill for structuredClone (React Native compatibility)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Get configuration from app.config.js extra or fallback to hardcoded values for development
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pyzdfteicahfzyuoxgwg.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5emRmdGVpY2FoZnp5dW94Z3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjU1MTIsImV4cCI6MjA2NjM0MTUxMn0.LLy0stoEf3vuH33l-EMEa56Yow12bxlNzhXYejVpR4o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helpers
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Username-based authentication
export const signInWithUsername = async (username: string, password: string) => {
  try {
    // First, find the user by username to get their dummy email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, id, username, first_name, last_name, role, school_id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      return { 
        data: null, 
        error: { message: 'Invalid username or password' } 
      };
    }

    // Use the dummy email to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    });

    if (error) {
      return { 
        data: null, 
        error: { message: 'Invalid username or password' } 
      };
    }

    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: { message: 'An error occurred during login' } 
    };
  }
};

// Create user with username (for admin use)
export const createUserWithUsername = async (
  username: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'school_admin' | 'teacher' | 'parent' | 'student',
  schoolId: string,
  phone?: string,
  employeeId?: string
) => {
  try {
    // Generate dummy email
    const dummyEmail = `${username}@${schoolId}.local`;
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dummyEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username,
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError || !authData.user) {
      return { data: null, error: authError };
    }

    // Create user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: dummyEmail,
        username: username,
        first_name: firstName,
        last_name: lastName,
        role: role,
        school_id: schoolId,
        phone: phone,
        employee_id: employeeId
      })
      .select()
      .single();

    if (userError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: userError };
    }

    return { data: userData, error: null };
  } catch (error) {
    return { data: null, error: { message: 'Failed to create user' } };
  }
};

// Generate username for new users
export const generateUsername = async (
  role: 'school_admin' | 'teacher' | 'parent' | 'student',
  schoolId: string,
  employeeId?: string
) => {
  try {
    if (role === 'teacher' && employeeId) {
      // Check if employee_id is available as username
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', employeeId)
        .single();
      
      if (!existing) {
        return employeeId;
      }
    }

    // Generate prefix based on role
    let prefix = '';
    switch (role) {
      case 'school_admin':
        prefix = 'admin';
        break;
      case 'teacher':
        prefix = 'T';
        break;
      case 'parent':
        prefix = 'P';
        break;
      case 'student':
        prefix = 'S';
        break;
    }

    // Find next available number
    const { data: users } = await supabase
      .from('users')
      .select('username')
      .eq('school_id', schoolId)
      .like('username', `${prefix}%`);

    let maxNumber = 0;
    if (users) {
      users.forEach(user => {
        const match = user.username.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    throw new Error('Failed to generate username');
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}; 