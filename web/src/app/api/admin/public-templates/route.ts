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

export async function GET(request: NextRequest) {
  try {
    // Fetch all public templates
    const { data: templates, error } = await supabaseAdmin
      .from('report_templates')
      .select(`
        id,
        name,
        board,
        class_range,
        preview_image_url,
        usage_count,
        last_used_at,
        created_at,
        created_by,
        meta
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Add description from meta if available
    const templatesWithDescription = templates.map(template => ({
      ...template,
      description: template.meta?.description || null
    }));

    return NextResponse.json(templatesWithDescription);

  } catch (error: any) {
    console.error('Public templates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 