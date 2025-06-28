import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

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
    const { user_id, temporary_password, school_id } = await request.json();

    if (!user_id || !temporary_password || !school_id) {
      return NextResponse.json(
        { error: 'User ID, temporary password, and school ID are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (temporary_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get target user info from database
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, school_id, first_name, last_name, status')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Verify user belongs to the correct school
    if (targetUser.school_id !== school_id) {
      return NextResponse.json(
        { error: 'Can only invite users from your school' },
        { status: 403 }
      );
    }

    // Verify user is teacher or parent
    if (!['teacher', 'parent'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Can only invite teachers and parents' },
        { status: 403 }
      );
    }

    // Check if auth user already exists
    const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (existingAuthUser.user && !authCheckError) {
      return NextResponse.json(
        { error: 'User already has an account. Use password reset instead.' },
        { status: 400 }
      );
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      id: user_id, // Use the same ID as database record
      email: targetUser.email,
      password: temporary_password,
      email_confirm: true,
      user_metadata: {
        role: targetUser.role,
        school_id: targetUser.school_id,
        first_name: targetUser.first_name,
        last_name: targetUser.last_name,
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      
      // Check if user already exists (different error handling)
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'User email is already registered. Use password reset instead.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Update user status to active if needed
    if (targetUser.status !== 'active') {
      await supabaseAdmin
        .from('users')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);
    }

    // Log the action for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        school_id: school_id,
        user_id: null, // No current user context in API route
        action: 'user_invited',
        target_type: 'user',
        target_id: user_id,
        details: {
          target_user: `${targetUser.first_name} ${targetUser.last_name}`,
          target_email: targetUser.email,
          target_role: targetUser.role,
          action: 'Created Supabase auth account'
        }
      });

    return NextResponse.json({
      success: true,
      message: `${targetUser.role} account created successfully. They can now login with their email and the temporary password.`,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: targetUser.role
      }
    });

  } catch (error: any) {
    console.error('Invite user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 