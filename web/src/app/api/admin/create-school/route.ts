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
      name, 
      domain, 
      adminEmail, 
      adminPassword,
      // Enhanced school details (matching form field names)
      logo_url,
      website_url,
      email_address,
      phone_number,
      address,
      principal_name,
      principal_email,
      principal_phone,
      theme_colors,
      school_type,
      board_affiliation,
      establishment_year,
      total_capacity,
      description,
      settings
    } = await request.json();

    // Validate required fields
    if (!name || !domain || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: name, domain, adminEmail, adminPassword' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid admin email format' },
        { status: 400 }
      );
    }

    if (principal_email && !emailRegex.test(principal_email)) {
      return NextResponse.json(
        { error: 'Invalid principal email format' },
        { status: 400 }
      );
    }

    // Default address structure
    const defaultAddress = {
      street: '',
      city: '',
      state: '',
      country: '',
      postal_code: ''
    };

    // Default theme colors
    const defaultThemeColors = {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9'
    };

    // Default settings
    const defaultSettings = {
      timezone: 'UTC',
      academic_year_start: 'April',
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    };

    // 1. Create the school with enhanced details
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name,
        domain,
        logo_url: logo_url || null,
        website_url: website_url || null,
        email_address: email_address || null,
        phone_number: phone_number || null,
        address: address || defaultAddress,
        principal_name: principal_name || null,
        principal_email: principal_email || null,
        principal_phone: principal_phone || null,
        theme_colors: theme_colors || defaultThemeColors,
        school_type: school_type || 'public',
        board_affiliation: board_affiliation || null,
        establishment_year: establishment_year ? parseInt(establishment_year) : null,
        total_capacity: total_capacity ? parseInt(total_capacity) : null,
        description: description || null,
        settings: settings || defaultSettings,
        enabled_features: {
          core: true,
          attend: false,
          exam: false,
          fee: false,
          hw: false,
          announce: false,
          chat: false,
          lib: false,
          transport: false,
        },
        status: 'active',
      })
      .select()
      .single();

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return NextResponse.json(
        { error: 'Failed to create school', details: schoolError.message },
        { status: 500 }
      );
    }

    // 2. Create admin user account using service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'school_admin',
        school_id: schoolData.id,
        school_name: schoolData.name,
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      // Clean up: delete the school if user creation failed
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id);
      return NextResponse.json(
        { error: 'Failed to create admin user', details: authError.message },
        { status: 500 }
      );
    }

    // 3. Insert user into our users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        role: 'school_admin',
        school_id: schoolData.id,
      });

    if (userError) {
      console.error('User table insertion error:', userError);
      // Clean up: delete auth user and school
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id);
      return NextResponse.json(
        { error: 'Failed to create user record', details: userError.message },
        { status: 500 }
      );
    }

    // 4. Add the user to school_admins table as primary admin
    const { error: schoolAdminError } = await supabaseAdmin
      .from('school_admins')
      .insert({
        school_id: schoolData.id,
        user_id: authData.user.id,
        role: 'admin',
        is_primary: true,
        permissions: {
          manage_users: true,
          manage_students: true,
          manage_teachers: true,
          manage_timetable: true,
          manage_attendance: true,
          manage_homework: true,
          manage_announcements: true,
          view_analytics: true
        }
      });

    if (schoolAdminError) {
      console.error('School admin insertion error:', schoolAdminError);
      // Clean up: delete auth user and school
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id);
      return NextResponse.json(
        { error: 'Failed to create school admin record', details: schoolAdminError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      school: schoolData,
      user: { id: authData.user.id, email: adminEmail },
      message: 'School and admin account created successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 