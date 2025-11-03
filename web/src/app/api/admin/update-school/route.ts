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

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      name,
      domain,
      // Enhanced school details
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
      board_type,
      state_board_type,
      assessment_pattern,
      establishment_year,
      total_capacity,
      description,
      settings
    } = await request.json();

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email_address && !emailRegex.test(email_address)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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

    // Update the school with enhanced details
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .update({
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
        board_type: board_type || null,
        state_board_type: state_board_type || null,
        assessment_pattern: assessment_pattern || null,
        establishment_year: establishment_year ? parseInt(establishment_year) : null,
        total_capacity: total_capacity ? parseInt(total_capacity) : null,
        description: description || null,
        settings: settings || defaultSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (schoolError) {
      console.error('School update error:', schoolError);
      return NextResponse.json(
        { error: 'Failed to update school', details: schoolError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      school: schoolData,
      message: 'School updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 