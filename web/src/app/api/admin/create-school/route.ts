import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { name, domain, adminEmail, adminPassword } = await request.json();

    // Validate input
    if (!name || !domain || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Create the school
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name,
        domain,
        enabled_features: {
          core: true,
          attend: false,
          exam: false,
          fee: false,
          hw: false,
          announce: false,
          chat: false,
          lib: false,
          transport: false,
        },
        status: 'active',
      })
      .select()
      .single();

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return NextResponse.json(
        { error: 'Failed to create school', details: schoolError.message },
        { status: 500 }
      );
    }

    // 2. Create admin user account using service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'school_admin',
        school_id: schoolData.id,
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      // Clean up: delete the school if user creation failed
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id);
      return NextResponse.json(
        { error: 'Failed to create admin user', details: authError.message },
        { status: 500 }
      );
    }

    // 3. Insert user into our users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        role: 'school_admin',
        school_id: schoolData.id,
      });

    if (userError) {
      console.error('User table insertion error:', userError);
      // Clean up: delete auth user and school
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id);
      return NextResponse.json(
        { error: 'Failed to create user record', details: userError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      school: schoolData,
      user: { id: authData.user.id, email: adminEmail }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 