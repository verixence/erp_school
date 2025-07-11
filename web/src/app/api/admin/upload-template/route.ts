import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
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
    
    // Extract form fields
    const name = formData.get('name') as string;
    const board = formData.get('board') as string;
    const class_range = formData.get('class_range') as string;
    const description = formData.get('description') as string;
    const template_html = formData.get('template_html') as string;
    const template_css = formData.get('template_css') as string;
    const preview_image = formData.get('preview_image') as File | null;
    const grade_rules = JSON.parse(formData.get('grade_rules') as string);
    const i18n_bundle = JSON.parse(formData.get('i18n_bundle') as string);
    const meta = JSON.parse(formData.get('meta') as string);

    // Validate required fields
    if (!name || !board || !class_range || !template_html) {
      return NextResponse.json(
        { error: 'Missing required fields: name, board, class_range, template_html' },
        { status: 400 }
      );
    }

    // Validate board
    const validBoards = ['CBSE', 'ICSE', 'State', 'IB', 'IGCSE'];
    if (!validBoards.includes(board)) {
      return NextResponse.json(
        { error: 'Invalid board. Must be one of: ' + validBoards.join(', ') },
        { status: 400 }
      );
    }

    let preview_image_url = null;

    // Upload preview image if provided
    if (preview_image && preview_image.size > 0) {
      try {
        const fileExt = preview_image.name.split('.').pop();
        const fileName = `template-preview-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('template-previews')
          .upload(fileName, preview_image);

        if (uploadError) {
          console.error('Preview image upload error:', uploadError);
          // Continue without preview image if upload fails
        } else {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('template-previews')
            .getPublicUrl(fileName);

          preview_image_url = publicUrl;
        }
      } catch (error) {
        console.error('Preview image processing failed:', error);
        // Continue without preview image
      }
    }

    // Prepare enhanced meta with description
    const enhancedMeta = {
      ...meta,
      description,
      upload_timestamp: new Date().toISOString(),
      template_version: '1.0'
    };

    // Create the public template
    const { data: template, error: createError } = await supabaseAdmin
      .from('report_templates')
      .insert({
        name,
        board,
        class_range,
        template_html,
        template_css,
        grade_rules,
        i18n_bundle,
        meta: enhancedMeta,
        preview_image_url,
        is_public: true,
        is_default: false,
        editable_by_school: true,
        school_id: null, // Public templates don't belong to any school
        usage_count: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('Template creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create template: ' + createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 