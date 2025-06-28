import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Environment check
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
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
    const { user_id, new_password, school_id } = await request.json();

    if (!user_id || !new_password || !school_id) {
      return NextResponse.json(
        { error: 'User ID, new password, and school ID are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get target user info to verify they belong to the same school (use admin client)
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('school_id, email, role, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.school_id !== school_id) {
      return NextResponse.json(
        { error: 'Can only reset passwords for users in your school' },
        { status: 403 }
      );
    }

    if (!['teacher', 'parent'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Can only reset passwords for teachers and parents' },
        { status: 403 }
      );
    }

    // Use Supabase Admin API to update the user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Password reset error:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset password', details: updateError.message },
        { status: 500 }
      );
    }

    // Log the action for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        school_id: school_id,
        user_id: null, // No current user context in API route
        action: 'password_reset',
        target_type: 'user',
        target_id: user_id,
        details: {
          target_user: `${targetUser.first_name} ${targetUser.last_name}`,
          target_email: targetUser.email,
          target_role: targetUser.role
        }
      });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${targetUser.first_name} ${targetUser.last_name}`
    });

  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 