import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, role, permissions, schoolId } = await request.json();

    if (!email || !password || !role || !permissions || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create auth user with service role
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 400 }
      );
    }

    // Create user record in our database
    const { data: newUser, error: createUserError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: email,
        role: 'school_admin',
        school_id: schoolId,
      })
      .select('id')
      .single();

    if (createUserError) {
      // If user creation fails, clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error('User creation error:', createUserError);
      return NextResponse.json(
        { error: `Failed to create user record: ${createUserError.message}` },
        { status: 400 }
      );
    }

    // Create school admin record
    const { error: adminError } = await supabaseAdmin
      .from('school_admins')
      .insert({
        school_id: schoolId,
        user_id: newUser.id,
        role: role,
        is_primary: false,
        permissions: permissions,
      });

    if (adminError) {
      // Clean up on failure
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('users').delete().eq('id', newUser.id);
      console.error('Admin creation error:', adminError);
      return NextResponse.json(
        { error: `Failed to create admin record: ${adminError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Administrator created successfully',
      userId: newUser.id 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 