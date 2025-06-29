import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../common/src/api/database.types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helper function for error handling
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred'
  
  if (typeof error === 'string') return error
  
  if (error.message) return error.message
  
  if (error.error_description) return error.error_description
  
  return 'An unexpected error occurred'
}

// Type-safe query helper
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const result = await operation()
    
    if (result.error) {
      return {
        data: null,
        error: handleSupabaseError(result.error),
      }
    }
    
    return {
      data: result.data,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: handleSupabaseError(error),
    }
  }
} 