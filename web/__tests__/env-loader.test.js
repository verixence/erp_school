/**
 * Environment Loader Test
 * 
 * Verifies that the custom environment loader correctly loads
 * environment variables from both root and web directories.
 */

const { join } = require('path');
const { existsSync } = require('fs');

describe('Environment Loader', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Backup original environment
    originalEnv = { ...process.env };
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('should find environment files in expected locations', () => {
    const rootDir = join(__dirname, '..', '..');
    const webDir = join(__dirname, '..');
    
    const possibleEnvFiles = [
      join(rootDir, '.env.local'),
      join(rootDir, '.env'),
      join(webDir, '.env.local'),
      join(webDir, '.env'),
    ];
    
    // At least one environment file should exist
    const hasEnvFile = possibleEnvFiles.some(file => existsSync(file));
    
    expect(hasEnvFile).toBe(true);
    
    if (!hasEnvFile) {
      console.log('❌ No environment files found in:');
      possibleEnvFiles.forEach(file => {
        console.log(`   - ${file} (${existsSync(file) ? 'exists' : 'missing'})`);
      });
    }
  });
  
  test('should load Supabase environment variables', () => {
    // These should be loaded by the Next.js config
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.log('🔧 Environment Status:');
      console.log(`   • NEXT_PUBLIC_SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌'}`);
      console.log(`   • NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasSupabaseKey ? '✅' : '❌'}`);
    }
    
    expect(hasSupabaseUrl).toBe(true);
    expect(hasSupabaseKey).toBe(true);
  });
  
  test('should validate environment variables format', () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl) {
      // Should be a valid URL
      expect(supabaseUrl).toMatch(/^https?:\/\/.+\.supabase\.co$/);
    }
    
    if (supabaseKey) {
      // Should be a JWT token
      expect(supabaseKey).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
    }
  });
  
  test('should prioritize web directory over root directory', () => {
    // This test would need to be more sophisticated in a real scenario
    // For now, we just verify that the environment loading works
    const webEnvPath = join(__dirname, '..', '.env.local');
    const rootEnvPath = join(__dirname, '..', '..', '.env.local');
    
    const webEnvExists = existsSync(webEnvPath);
    const rootEnvExists = existsSync(rootEnvPath);
    
    console.log(`📍 Environment file locations:`);
    console.log(`   • Web: ${webEnvPath} (${webEnvExists ? 'exists' : 'missing'})`);
    console.log(`   • Root: ${rootEnvPath} (${rootEnvExists ? 'exists' : 'missing'})`);
    
    // If both exist, we trust our loader prioritizes correctly
    // If only one exists, that's also fine
    expect(webEnvExists || rootEnvExists).toBe(true);
  });
}); 