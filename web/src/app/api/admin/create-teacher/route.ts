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
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      employee_id, 
      subjects, 
      password,
      school_id 
    } = await request.json();

    // Validate input
    if (!first_name || !last_name || !email || !employee_id || !subjects || !password || !school_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if employee ID is unique within the school
    const { data: existingEmployee, error: employeeCheckError } = await supabaseAdmin
      .rpc('check_employee_id_unique', {
        p_school_id: school_id,
        p_employee_id: employee_id,
      });

    if (employeeCheckError) {
      console.error('Employee ID check error:', employeeCheckError);
      return NextResponse.json(
        { error: 'Failed to validate employee ID' },
        { status: 500 }
      );
    }

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee ID already exists in this school' },
        { status: 400 }
      );
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'teacher',
        school_id,
        first_name,
        last_name,
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
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

    // 2. Create user record in users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role: 'teacher',
        school_id,
        first_name,
        last_name,
        phone,
        employee_id,
        subjects,
      });

    if (userError) {
      console.error('User table insert error:', userError);
      
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: `Failed to create teacher record: ${userError.message}` },
        { status: 500 }
      );
    }

    // 3. Create teacher record in teachers table
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert({
        user_id: authData.user.id,
        school_id,
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        department: null, // Can be updated later
        subjects,
        status: 'active'
      });

    if (teacherError) {
      console.error('Teacher table insert error:', teacherError);
      
      // Rollback: delete both auth user and user record
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      
      return NextResponse.json(
        { error: `Failed to create teacher profile: ${teacherError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user_id: authData.user.id,
      message: 'Teacher created successfully with login account'
    });

  } catch (error: any) {
    console.error('Create teacher error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 