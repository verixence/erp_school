import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { templateId, schoolId } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Use user session for authentication
    const supabase = createServerSupabaseClient(request);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details and school
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine target school ID
    const targetSchoolId = schoolId || userData.school_id;

    // Authorization checks
    if (userData.role !== 'super_admin' && userData.school_id !== targetSchoolId) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Use admin client for database operations
    // Clone the template using the database function
    const { data: newTemplateId, error: cloneError } = await supabaseAdmin.rpc(
      'clone_template_for_school',
      {
        template_id: templateId,
        target_school_id: targetSchoolId
      }
    );

    if (cloneError) {
      console.error('Clone error:', cloneError);
      return NextResponse.json(
        { error: cloneError.message || 'Failed to clone template' },
        { status: 500 }
      );
    }

    // Fetch the cloned template details
    const { data: clonedTemplate, error: fetchError } = await supabaseAdmin
      .from('report_templates')
      .select('*')
      .eq('id', newTemplateId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Template cloned but failed to fetch details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: clonedTemplate
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 