import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables that should be provided by the consuming app
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  
  return { url, anonKey };
};

// Create Supabase client
export const createSupabaseClient = (): SupabaseClient<Database> => {
  const { url, anonKey } = getSupabaseConfig();
  
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
};

// Default client instance
export const supabase = createSupabaseClient();

// Helper function for server-side operations (web only)
export const createServerSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  if (typeof window !== 'undefined') {
    throw new Error('createServerSupabaseClient should only be called on the server side');
  }
  
  // This will be implemented differently for web vs mobile
  return createSupabaseClient();
};

// Error handling utilities
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  if (error.error_description) return error.error_description;
  
  return 'An unexpected error occurred';
};

// Type-safe query helpers
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const result = await operation();
    
    if (result.error) {
      return {
        data: null,
        error: handleSupabaseError(result.error),
      };
    }
    
    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: handleSupabaseError(error),
    };
  }
}; 