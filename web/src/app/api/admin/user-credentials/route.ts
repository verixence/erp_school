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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const role = searchParams.get('role');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('users')
      .select('id, username, email, first_name, last_name, role, employee_id, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Transform data to show login credentials
    const userCredentials = users?.map(user => {
      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';
      
      return {
        id: user.id,
        name: displayName,
        role: user.role,
        employee_id: user.employee_id,
        username: user.username,
        email: user.email,
        loginMethod: user.username ? 'Username' : 'Email',
        loginCredential: user.username || user.email,
        created_at: user.created_at
      };
    });

    return NextResponse.json({
      success: true,
      users: userCredentials,
      count: userCredentials?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId and newPassword are required' },
        { status: 400 }
      );
    }

    // Update user password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      console.error('Error updating password:', error);
      return NextResponse.json(
        { error: `Failed to update password: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}