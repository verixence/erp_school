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
    const { user_id, new_password, school_id } = await request.json();

    if (!user_id || !new_password || !school_id) {
      return NextResponse.json(
        { error: 'User ID, new password, and school ID are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get user info to verify they belong to the same school
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('school_id, email, role, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      console.error('User lookup failed:', { user_id, targetError, school_id });
      return NextResponse.json(
        { error: `User not found: ${targetError?.message || 'No user exists with this ID'}` },
        { status: 404 }
      );
    }

    // Verify school access
    if (targetUser.school_id !== school_id) {
      return NextResponse.json(
        { error: 'Can only reset passwords for users in your school' },
        { status: 403 }
      );
    }

    // Only allow password reset for teachers and parents
    if (!['teacher', 'parent'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Can only reset passwords for teachers and parents' },
        { status: 403 }
      );
    }

    // Check if auth user exists first
    const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    let authUserCreated = false;
    
    if (!existingAuthUser.user || authCheckError) {
      // Auth user doesn't exist, create one with the new password
      console.log(`Creating auth user for existing database user: ${targetUser.email}`);
      
      const { error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        id: user_id, // Use same ID as database record
        email: targetUser.email,
        password: new_password,
        email_confirm: true,
        user_metadata: {
          role: targetUser.role,
          school_id: targetUser.school_id,
          first_name: targetUser.first_name,
          last_name: targetUser.last_name,
        }
      });

      if (createAuthError) {
        console.error('Auth user creation error:', createAuthError);
        return NextResponse.json(
          { error: `Failed to create user account: ${createAuthError.message}` },
          { status: 500 }
        );
      }
      
      authUserCreated = true;
    } else {
      // Auth user exists, update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (updateError) {
        console.error('Password reset error:', updateError);
        return NextResponse.json(
          { error: `Failed to reset password: ${updateError.message}` },
          { status: 500 }
        );
      }
    }

    // Log the action for audit trail (don't block if this fails)
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          school_id: school_id,
          user_id: null, // No current user context in API route
          action: authUserCreated ? 'user_account_created' : 'password_reset',
          target_type: 'user',
          target_id: user_id,
          details: {
            target_user: `${targetUser.first_name} ${targetUser.last_name}`,
            target_email: targetUser.email,
            target_role: targetUser.role,
            account_created: authUserCreated
          }
        });
    } catch (auditError) {
      console.error('Audit log error (non-blocking):', auditError);
    }

    // Determine success message based on whether we created or updated
    const actionMessage = authUserCreated 
      ? `Account created and password set for ${targetUser.first_name} ${targetUser.last_name}`
      : `Password reset successfully for ${targetUser.first_name} ${targetUser.last_name}`;

    return NextResponse.json({ 
      success: true, 
      message: actionMessage 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 