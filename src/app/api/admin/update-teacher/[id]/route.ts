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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const teacherId = params.id;
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      employee_id, 
      subjects
    } = await request.json();

    // Validate input
    if (!first_name || !last_name || !email || !employee_id || !subjects) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current teacher data to validate school_id
    const { data: currentTeacher, error: teacherFetchError } = await supabaseAdmin
      .from('users')
      .select('id, school_id, employee_id')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single();

    if (teacherFetchError || !currentTeacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Check if employee ID is unique within the school (excluding current teacher)
    const { data: existingEmployee, error: employeeCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('school_id', currentTeacher.school_id)
      .eq('employee_id', employee_id)
      .neq('id', teacherId)
      .eq('role', 'teacher');

    if (employeeCheckError) {
      console.error('Employee ID check error:', employeeCheckError);
      return NextResponse.json(
        { error: 'Failed to validate employee ID' },
        { status: 500 }
      );
    }

    if (existingEmployee && existingEmployee.length > 0) {
      return NextResponse.json(
        { error: 'Employee ID already exists for another teacher in this school' },
        { status: 400 }
      );
    }

    // Check if email is unique (excluding current teacher)
    const { data: existingEmail, error: emailCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', teacherId);

    if (emailCheckError) {
      console.error('Email check error:', emailCheckError);
      return NextResponse.json(
        { error: 'Failed to validate email' },
        { status: 500 }
      );
    }

    if (existingEmail && existingEmail.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists for another user' },
        { status: 400 }
      );
    }

    // 1. Update user record in users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        email,
        first_name,
        last_name,
        phone,
        employee_id,
        subjects,
      })
      .eq('id', teacherId);

    if (userError) {
      console.error('User table update error:', userError);
      return NextResponse.json(
        { error: `Failed to update teacher record: ${userError.message}` },
        { status: 500 }
      );
    }

    // 2. Update teacher record in teachers table
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .update({
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        subjects,
      })
      .eq('user_id', teacherId);

    if (teacherError) {
      console.error('Teacher table update error:', teacherError);
      return NextResponse.json(
        { error: `Failed to update teacher profile: ${teacherError.message}` },
        { status: 500 }
      );
    }

    // 3. Update auth user email if it changed
    try {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        teacherId,
        {
          email,
          user_metadata: {
            first_name,
            last_name,
          }
        }
      );

      if (authUpdateError) {
        console.warn('Auth user update warning:', authUpdateError);
        // Don't fail the request for auth update issues
      }
    } catch (authError) {
      console.warn('Auth user update warning:', authError);
      // Don't fail the request for auth update issues
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Teacher updated successfully'
    });

  } catch (error: any) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 