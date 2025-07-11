import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check migrations using the database function
    const { data: migrationStatus, error } = await supabase.rpc('check_migrations');

    if (error) {
      console.error('Migration check error:', error);
      return NextResponse.json({
        success: false,
        migrationApplied: false,
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      migrationApplied: migrationStatus === true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      migrationApplied: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 