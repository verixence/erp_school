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
    const {
      first_name,
      last_name,
      email,
      phone,
      relation,
      school_id,
      children = []
    } = await request.json();

    // Validate required fields
    if (!first_name || !last_name || !email || !relation || !school_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a temporary password for the parent
    const tempPassword = `Parent${Math.random().toString(36).slice(-8)}!`;

    // 1. Create auth user using service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'parent',
        school_id,
        first_name,
        last_name,
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: 'Failed to create parent auth user', details: authError.message },
        { status: 500 }
      );
    }

    // 2. Insert parent into users table
    const { data: parentData, error: parentError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role: 'parent',
        school_id,
        first_name,
        last_name,
        phone,
        relation,
      })
      .select()
      .single();

    if (parentError) {
      console.error('Parent table insertion error:', parentError);
      // Clean up: delete auth user if parent creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create parent record', details: parentError.message },
        { status: 500 }
      );
    }

    // 3. Link selected children to parent using student_parents table
    if (children.length > 0) {
      console.log('Linking children to parent:', { parentId: parentData.id, children });
      
      // Create entries in student_parents junction table
      const linkData = children.map((studentId: string) => ({
        student_id: studentId,
        parent_id: parentData.id
      }));

      const { data: parentLinks, error: childrenError } = await supabaseAdmin
        .from('student_parents')
        .insert(linkData)
        .select();

      if (childrenError) {
        console.error('Children linking error:', childrenError);
        // Don't fail the entire operation, just log the error
        console.warn('Failed to link children to parent, but parent was created successfully');
      } else {
        console.log('Successfully linked children:', parentLinks);
      }
    }

    return NextResponse.json({
      success: true,
      parent: parentData,
      tempPassword, // Return temp password so it can be communicated to the parent
      childrenAssigned: children.length
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 