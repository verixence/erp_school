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
    const { 
      user_id: providedUserId, 
      new_password, 
      school_id,
      // Optional fields for user creation when user doesn't exist
      email,
      first_name,
      last_name,
      phone,
      role,
      employee_id,
      student_id,
      subjects
    } = await request.json();

    if (!providedUserId || !new_password || !school_id) {
      return NextResponse.json(
        { error: 'User ID, new password, and school ID are required' },
        { status: 400 }
      );
    }

    // Use a mutable variable for the actual user ID to process
    let user_id = providedUserId;

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
      .select('school_id, email, role, first_name, last_name, phone, employee_id, student_id, subjects')
      .eq('id', user_id)
      .single();

    let isNewUser = false;
    let userToProcess: {
      school_id: string;
      email: string;
      role: string;
      first_name: string;
      last_name: string;
      phone?: string | null;
      employee_id?: string | null;
      student_id?: string | null;
      subjects?: any;
    };

        // SIMPLE LOGIC: Check if user exists, if not create them
    if (targetError || !targetUser) {
      // User ID not found, check if email exists in same school
      const { data: existingEmailUser, error: emailCheckError } = await supabaseAdmin
        .from('users')
        .select('id, school_id, email, role, first_name, last_name, phone, employee_id, student_id, subjects')
        .eq('email', email)
        .eq('school_id', school_id)
        .single();

      if (existingEmailUser) {
        // Email exists in same school → just reset password for existing user
        console.log(`User found by email ${email}, resetting password for existing user ${existingEmailUser.id}`);
        isNewUser = false;
        userToProcess = existingEmailUser;
        user_id = existingEmailUser.id;
      } else {
        // Email doesn't exist → create new user
        console.log(`Creating new user with email ${email}`);
        
        // Validate required fields for user creation
        if (!email || !first_name || !last_name || !role) {
          return NextResponse.json(
            { error: 'To create a new user, provide: email, first_name, last_name, and role' },
            { status: 400 }
          );
        }

        // Validate role
        if (!['teacher', 'parent', 'student'].includes(role)) {
          return NextResponse.json(
            { error: 'Role must be teacher, parent, or student' },
            { status: 400 }
          );
        }

        // Validate role-specific requirements
        if (role === 'teacher' && !employee_id) {
          return NextResponse.json(
            { error: 'Employee ID is required for teachers' },
            { status: 400 }
          );
        }

        if (role === 'student' && !student_id) {
          return NextResponse.json(
            { error: 'Student ID is required for students' },
            { status: 400 }
          );
        }

        // Check for duplicate employee_id or student_id (only for NEW users)
        if (role === 'teacher' && employee_id) {
          const { data: existingEmployee } = await supabaseAdmin
            .rpc('check_employee_id_unique', {
              p_school_id: school_id,
              p_employee_id: employee_id,
            });

          if (!existingEmployee) {
            return NextResponse.json(
              { error: 'Employee ID already exists in this school' },
              { status: 400 }
            );
          }
        }

        // Create new user record
        const { error: userInsertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: user_id,
            email,
            role,
            school_id,
            first_name,
            last_name,
            phone: phone || null,
            employee_id: role === 'teacher' ? employee_id : null,
            student_id: role === 'student' ? student_id : null,
            subjects: role === 'teacher' ? subjects : null
          });

        if (userInsertError) {
          console.error('User insert error:', userInsertError);
          return NextResponse.json(
            { error: `Failed to create user record: ${userInsertError.message}` },
            { status: 500 }
          );
        }

        // Create role-specific records
        if (role === 'teacher') {
          const { error: teacherError } = await supabaseAdmin
            .from('teachers')
            .insert({
              user_id: user_id,
              school_id,
              employee_id,
              first_name,
              last_name,
              email,
              phone: phone || null,
              subjects: subjects || [],
              status: 'active'
            });

          if (teacherError) {
            console.error('Teacher insert error:', teacherError);
            // Rollback user creation
            await supabaseAdmin.from('users').delete().eq('id', user_id);
            return NextResponse.json(
              { error: `Failed to create teacher record: ${teacherError.message}` },
              { status: 500 }
            );
          }
        } else if (role === 'student') {
          const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
              user_id: user_id,
              school_id,
              student_id,
              first_name,
              last_name,
              email,
              phone: phone || null,
              status: 'active'
            });

          if (studentError) {
            console.error('Student insert error:', studentError);
            // Rollback user creation
            await supabaseAdmin.from('users').delete().eq('id', user_id);
            return NextResponse.json(
              { error: `Failed to create student record: ${studentError.message}` },
              { status: 500 }
            );
          }
        }

        isNewUser = true;
        userToProcess = {
          school_id,
          email,
          role,
          first_name,
          last_name,
          phone,
          employee_id,
          student_id,
          subjects
        };
      }
    } else {
      // User exists by user_id → just reset password
      console.log(`User found by ID ${user_id}, resetting password for existing user`);
      isNewUser = false;
      userToProcess = targetUser;
      
      // Validate school access
      if (userToProcess.school_id !== school_id) {
        return NextResponse.json(
          { error: 'Can only reset passwords for users in your school' },
          { status: 403 }
        );
      }

      if (!['teacher', 'parent', 'student'].includes(userToProcess.role)) {
        return NextResponse.json(
          { error: 'Can only reset passwords for teachers, parents, and students' },
          { status: 403 }
        );
      }
    }

    // Check if auth user exists first
    const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    let authUser = existingAuthUser?.user;
    
    // If no auth user exists, create one first
    if (!authUser || authCheckError) {
      console.log(`Creating auth user for ${isNewUser ? 'new' : 'existing'} database user: ${userToProcess.email}`);
      
      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        id: user_id, // Use same ID as database record
        email: userToProcess.email,
        password: new_password,
        email_confirm: true,
        user_metadata: {
          role: userToProcess.role,
          school_id: userToProcess.school_id,
          first_name: userToProcess.first_name,
          last_name: userToProcess.last_name,
        }
      });

      if (createAuthError) {
        console.error('Auth user creation error:', createAuthError);
        
        // If this was a new user, rollback the database records
        if (isNewUser) {
          await supabaseAdmin.from('users').delete().eq('id', user_id);
          if (userToProcess.role === 'teacher') {
            await supabaseAdmin.from('teachers').delete().eq('user_id', user_id);
          } else if (userToProcess.role === 'student') {
            await supabaseAdmin.from('students').delete().eq('user_id', user_id);
          }
        }
        
        return NextResponse.json(
          { error: `Failed to create user account: ${createAuthError.message}` },
          { status: 500 }
        );
      }

      authUser = newAuthUser.user;
    } else {
      // Auth user exists, update password
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
    }

    // Update user updated_at timestamp if needed (for newly created accounts)
    if (!existingAuthUser?.user || authCheckError || isNewUser) {
      await supabaseAdmin
        .from('users')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);
    }

    // Determine action type for audit log
    const actionType = isNewUser ? 'user_created' : (!existingAuthUser?.user || authCheckError) ? 'user_account_created' : 'password_reset';
    let actionMessage = '';
    
    if (isNewUser) {
      actionMessage = `New ${userToProcess.role} user created: ${userToProcess.first_name} ${userToProcess.last_name}`;
    } else if (!existingAuthUser?.user || authCheckError) {
      actionMessage = `Account created and password set for ${userToProcess.first_name} ${userToProcess.last_name}`;
    } else {
      actionMessage = `Password reset successfully for ${userToProcess.first_name} ${userToProcess.last_name}`;
    }

    // Log the action for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        school_id: school_id,
        user_id: null, // No current user context in API route
        action: actionType,
        target_type: 'user',
        target_id: user_id,
        details: {
          target_user: `${userToProcess.first_name} ${userToProcess.last_name}`,
          target_email: userToProcess.email,
          target_role: userToProcess.role,
          user_created: isNewUser,
          account_created: (!existingAuthUser?.user || authCheckError || isNewUser)
        }
      });

    return NextResponse.json({
      success: true,
      message: actionMessage,
      userCreated: isNewUser,
      accountCreated: (!existingAuthUser?.user || authCheckError || isNewUser)
    });

  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 