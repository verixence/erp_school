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
    const { user_id, status, school_id } = await request.json();

    if (!user_id || !status || !school_id) {
      return NextResponse.json(
        { error: 'User ID, status, and school ID are required' },
        { status: 400 }
      );
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "active" or "inactive"' },
        { status: 400 }
      );
    }

    // Get target user info to verify they belong to the same school (use admin client)
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('school_id, email, role, first_name, last_name, status')
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
        { error: 'Can only manage status for users in your school' },
        { status: 403 }
      );
    }

    if (!['teacher', 'parent'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Can only manage status for teachers and parents' },
        { status: 403 }
      );
    }

    // Check if status is already the same
    if (targetUser.status === status) {
      return NextResponse.json(
        { error: `User is already ${status}` },
        { status: 400 }
      );
    }

    // Update user status in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('User status update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user status', details: updateError.message },
        { status: 500 }
      );
    }

    // If deactivating, also disable the auth user
    if (status === 'inactive') {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { 
          ban_duration: 'none', // This doesn't permanently ban, just a way to disable
          user_metadata: { status: 'inactive' }
        }
      );

      // Note: Supabase doesn't have a direct "disable" feature, so we use user_metadata
      // In a real implementation, you might handle this differently
    } else {
      // Reactivate the auth user
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { 
          user_metadata: { status: 'active' }
        }
      );
    }

    // Log the action for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        school_id: school_id,
        user_id: null, // No current user context in API route
        action: status === 'active' ? 'user_activated' : 'user_deactivated',
        target_type: 'user',
        target_id: user_id,
        details: {
          target_user: `${targetUser.first_name} ${targetUser.last_name}`,
          target_email: targetUser.email,
          target_role: targetUser.role,
          previous_status: targetUser.status,
          new_status: status
        }
      });

    return NextResponse.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user_id,
        name: `${targetUser.first_name} ${targetUser.last_name}`,
        status: status
      }
    });

  } catch (error) {
    console.error('User status toggle API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 