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
    const formData = await request.formData();
    const templateDataString = formData.get('template_data') as string;
    const logoFile = formData.get('logo') as File | null;

    if (!templateDataString) {
      return NextResponse.json(
        { error: 'Template data is required' },
        { status: 400 }
      );
    }

    const templateData = JSON.parse(templateDataString);
    const { id, name, meta, grade_rules } = templateData;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Template ID and name are required' },
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

    // Get user details
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

    // Verify template ownership
    const { data: template, error: templateError } = await supabaseAdmin
      .from('report_templates')
      .select('school_id, origin_template_id')
      .eq('id', id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if user can customize this template
    if (userData.role !== 'super_admin' && template.school_id !== userData.school_id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    let logoUrl = null;

    // Handle logo upload if provided
    if (logoFile && logoFile.size > 0) {
      try {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `school-logo-${userData.school_id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('school-logos')
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          // Continue without logo if upload fails
        } else {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('school-logos')
            .getPublicUrl(fileName);

          logoUrl = publicUrl;
        }
      } catch (error) {
        console.error('Logo processing failed:', error);
        // Continue without logo
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      meta: {
        ...meta,
        ...(logoUrl && { custom_logo_url: logoUrl }),
      },
      grade_rules,
      updated_at: new Date().toISOString(),
    };

    // Update the template
    const { data: updatedTemplate, error: updateError } = await supabaseAdmin
      .from('report_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Template update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: 'Template customized successfully'
    });

  } catch (error: any) {
    console.error('Customize template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 