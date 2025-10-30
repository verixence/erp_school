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

// Helper function to generate username
async function generateUsername(role: string, schoolId: string): Promise<string> {
  let prefix = '';
  switch (role) {
    case 'school_admin':
      prefix = 'admin';
      break;
    case 'teacher':
      prefix = 'T';
      break;
    case 'parent':
      prefix = 'P';
      break;
    case 'student':
      prefix = 'S';
      break;
    default:
      prefix = 'U';
  }

  // Find next available number
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('school_id', schoolId)
    .like('username', `${prefix}%`);

  let maxNumber = 0;
  if (users) {
    users.forEach(user => {
      if (user.username) {
        const match = user.username.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
  }

  const nextNumber = maxNumber + 1;
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      username: providedUsername,
      password,
      role,
      permissions,
      schoolId,
      first_name,
      last_name,
      useUsername = false // Flag to enable username mode
    } = await request.json();

    if (!password || !role || !permissions || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let finalEmail = email;
    let username = null;

    // Use provided username or generate one if useUsername is true
    if (useUsername) {
      if (providedUsername) {
        // Check if username already exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('username')
          .eq('school_id', schoolId)
          .eq('username', providedUsername)
          .single();

        if (existingUser) {
          return NextResponse.json(
            { error: 'Username already exists. Please choose a different username.' },
            { status: 400 }
          );
        }
        username = providedUsername;
      } else {
        // Auto-generate if no username provided
        username = await generateUsername('school_admin', schoolId);
      }
      finalEmail = `${username}@${schoolId}.local`;
    } else if (!email) {
      return NextResponse.json(
        { error: 'Email is required when not using username mode' },
        { status: 400 }
      );
    }

    // Create auth user with service role
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: username,
        first_name: first_name || null,
        last_name: last_name || null
      }
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
        email: finalEmail,
        username: username,
        first_name: first_name || null,
        last_name: last_name || null,
        role: 'school_admin',
        school_id: schoolId,
      })
      .select('id, username, email')
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
      userId: newUser.id,
      username: username,
      email: finalEmail,
      loginCredentials: username ? {
        username: username,
        password: password
      } : {
        email: finalEmail,
        password: password
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 