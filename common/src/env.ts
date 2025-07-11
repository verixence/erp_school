/**
 * 🔐 Environment Variables Validation
 * 
 * This module validates all environment variables required by CampusHoster
 * using Zod schemas. It ensures type safety and fails fast with clear error
 * messages if required variables are missing or malformed.
 * 
 * @module env
 */

import { z } from 'zod';

// =============================================================================
// 📋 Environment Schema Definitions
// =============================================================================

/**
 * Schema for Supabase URL validation
 * Must be a valid HTTPS URL pointing to a Supabase project
 */
const supabaseUrlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine(
    (url) => url.includes('.supabase.co') || url.includes('localhost') || url.includes('127.0.0.1'),
    'Must be a valid Supabase URL (containing .supabase.co) or localhost for development'
  );

/**
 * Schema for Supabase JWT keys
 * Must be a valid JWT token string
 */
const supabaseKeySchema = z
  .string()
  .min(10, 'Supabase key must be at least 10 characters')
  .refine(
    (key) => key.startsWith('eyJ') || key === 'test-key',
    'Must be a valid JWT token (starting with "eyJ") or "test-key" for testing'
  );

/**
 * Schema for Node environment
 */
const nodeEnvSchema = z
  .enum(['development', 'production', 'test'])
  .default('development');

// =============================================================================
// 🌐 Client-side Environment Schema
// =============================================================================

/**
 * Environment variables that are safe to expose to the client-side
 * These are prefixed with NEXT_PUBLIC_ and available in the browser
 */
const clientEnvSchema = z.object({
  /**
   * Supabase project URL - exposed to client
   * @example "https://abcdefghijklmnop.supabase.co"
   */
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,

  /**
   * Supabase anonymous/public key - exposed to client
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKeySchema,

  /**
   * Node.js environment
   * @default "development"
   */
  NODE_ENV: nodeEnvSchema,
});

// =============================================================================
// 🔒 Server-side Environment Schema  
// =============================================================================

/**
 * Environment variables that should only be available on the server-side
 * These contain sensitive information and must never be exposed to the client
 */
const serverEnvSchema = clientEnvSchema.extend({
  /**
   * Supabase service role key - SERVER ONLY
   * ⚠️ CRITICAL: This key has full database access and must be kept secret
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  SUPABASE_SERVICE_ROLE_KEY: supabaseKeySchema,
});

// =============================================================================
// 📱 Mobile Environment Schema (Optional)
// =============================================================================

/**
 * Environment variables for mobile applications (React Native/Expo)
 * These are optional and only needed if mobile apps are enabled
 */
const mobileEnvSchema = z.object({
  /**
   * Mobile Supabase URL for Expo apps
   * @example "https://abcdefghijklmnop.supabase.co"
   */
  EXPO_PUBLIC_SUPABASE_URL: supabaseUrlSchema.optional(),

  /**
   * Mobile Supabase anonymous key for Expo apps
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseKeySchema.optional(),
});

// =============================================================================
// 🏗️ Environment Validation Functions
// =============================================================================

/**
 * Validates client-side environment variables
 * These are safe to use in the browser
 */
export function validateClientEnv() {
  try {
    const env = clientEnvSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => 
        `❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(
        `🔐 Client Environment Validation Failed!\n\n${missingVars}\n\n` +
        `📋 Required client environment variables:\n` +
        `- NEXT_PUBLIC_SUPABASE_URL\n` +
        `- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n` +
        `💡 Copy .env.example to .env.local and fill in your Supabase credentials.`
      );
    }
    throw error;
  }
}

/**
 * Validates server-side environment variables
 * Includes both client and server variables
 */
export function validateServerEnv() {
  try {
    const env = serverEnvSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => 
        `❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(
        `🔐 Server Environment Validation Failed!\n\n${missingVars}\n\n` +
        `📋 Required server environment variables:\n` +
        `- NEXT_PUBLIC_SUPABASE_URL\n` +
        `- NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
        `- SUPABASE_SERVICE_ROLE_KEY\n\n` +
        `💡 Copy .env.example to .env.local and fill in your Supabase credentials.\n` +
        `⚠️  SUPABASE_SERVICE_ROLE_KEY is sensitive - never expose to client-side!`
      );
    }
    throw error;
  }
}

/**
 * Validates mobile environment variables (optional)
 * Returns undefined if mobile variables are not provided
 */
export function validateMobileEnv() {
  const mobileVars = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  // If no mobile vars are provided, return undefined (mobile is optional)
  if (!mobileVars.EXPO_PUBLIC_SUPABASE_URL && !mobileVars.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    return undefined;
  }

  try {
    return mobileEnvSchema.parse(mobileVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => 
        `❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(
        `📱 Mobile Environment Validation Failed!\n\n${missingVars}\n\n` +
        `📋 Required mobile environment variables:\n` +
        `- EXPO_PUBLIC_SUPABASE_URL\n` +
        `- EXPO_PUBLIC_SUPABASE_ANON_KEY\n\n` +
        `💡 These should match your NEXT_PUBLIC_ values for consistency.`
      );
    }
    throw error;
  }
}

// =============================================================================
// 🚀 Pre-validated Environment Objects
// =============================================================================

/**
 * Lazy-loaded client environment variables
 * Safe to use in browser/client-side code
 */
let _clientEnv: ClientEnv | null = null;
export const clientEnv = (() => {
  if (!_clientEnv) {
    _clientEnv = validateClientEnv();
  }
  return _clientEnv;
});

/**
 * Lazy-loaded server environment variables  
 * Contains sensitive data - only use on server-side
 * 
 * ⚠️ WARNING: Never import this in client-side code!
 */
let _serverEnv: ServerEnv | null = null;
export const serverEnv = (() => {
  if (!_serverEnv) {
    // Only validate server env if we're in a server context
    if (typeof window === 'undefined') {
      _serverEnv = validateServerEnv();
    } else {
      // Return client env for browser context
      _serverEnv = clientEnv() as ServerEnv;
    }
  }
  return _serverEnv;
});

/**
 * Server-only environment variables with full server access
 * ⚠️ CRITICAL: Only use this in API routes or server-side code!
 * This will always include the SUPABASE_SERVICE_ROLE_KEY
 */
export const getServerEnv = () => validateServerEnv();

/**
 * Lazy-loaded mobile environment variables
 * Optional - only available if mobile variables are configured
 */
let _mobileEnv: MobileEnv | undefined | null = null;
export const mobileEnv = (() => {
  if (_mobileEnv === null) {
    _mobileEnv = validateMobileEnv();
  }
  return _mobileEnv;
});

// =============================================================================
// 🛠️ Utility Functions
// =============================================================================

/**
 * Checks if all required environment variables are present
 * @param context - The context to check ('client', 'server', or 'mobile')
 */
export function checkEnvironment(context: 'client' | 'server' | 'mobile' = 'client'): boolean {
  try {
    switch (context) {
      case 'client':
        validateClientEnv();
        return true;
      case 'server':
        validateServerEnv();
        return true;
      case 'mobile':
        validateMobileEnv();
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Gets environment info for debugging
 * ⚠️ Only includes non-sensitive information
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasMobileSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    hasMobileSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    platform: typeof window === 'undefined' ? 'server' : 'client',
  };
}

// =============================================================================
// 📤 Type Exports
// =============================================================================

/**
 * Type for client environment variables
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Type for server environment variables
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Type for mobile environment variables
 */
export type MobileEnv = z.infer<typeof mobileEnvSchema>; 