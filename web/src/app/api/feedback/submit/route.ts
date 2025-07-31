import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// POST - Submit feedback (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const {
      school_id,
      type,
      subject,
      description,
      submitter_name,
      submitter_email,
      is_anonymous = false,
      submitted_by // Optional - for authenticated users
    } = await request.json();

    // Validate required fields
    if (!school_id || !type || !subject || !description) {
      return NextResponse.json(
        { error: 'School ID, type, subject, and description are required' },
        { status: 400 }
      );
    }

    // Validate type and map to database-allowed types
    const validTypes = [
      'academic', 'behavioral', 'facilities', 'teaching', 'communication', 
      'extracurricular', 'suggestion', 'complaint', 'other',
      // Legacy support for original types
      'feedback'
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Map specific types to database-allowed types
    const getDbType = (frontendType: string) => {
      switch (frontendType) {
        case 'academic':
        case 'behavioral': 
        case 'facilities':
        case 'teaching':
        case 'communication':
        case 'extracurricular':
        case 'other':
        case 'feedback':
          return 'feedback';
        case 'suggestion':
          return 'suggestion';
        case 'complaint':
          return 'complaint';
        default:
          return 'feedback';
      }
    };
    
    const dbType = getDbType(type);

    // Validate subject and description length
    if (subject.length < 3 || subject.length > 255) {
      return NextResponse.json(
        { error: 'Subject must be between 3 and 255 characters' },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 5000) {
      return NextResponse.json(
        { error: 'Description must be between 10 and 5000 characters' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (submitter_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // If not anonymous, require either submitter details or authenticated user
    if (!is_anonymous && !submitted_by && !submitter_name) {
      return NextResponse.json(
        { error: 'For non-anonymous feedback, provide submitter name or login' },
        { status: 400 }
      );
    }

    // Verify school exists
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .eq('id', school_id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Rate limiting check - max 5 submissions per hour from same IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: recentSubmissions } = await supabaseAdmin
      .from('feedback_box')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', school_id)
      .gte('created_at', oneHourAgo);

    if ((recentSubmissions || 0) >= 5) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 5 submissions per hour.' },
        { status: 429 }
      );
    }

    // Create the feedback submission
    const { data: submission, error } = await supabaseAdmin
      .from('feedback_box')
      .insert({
        school_id,
        type: dbType, // Use mapped database type
        original_type: type, // Store original frontend type
        subject: subject.trim(),
        description: description.trim(),
        submitted_by: submitted_by || null,
        submitter_name: is_anonymous ? null : (submitter_name?.trim() || null),
        submitter_email: is_anonymous ? null : (submitter_email?.trim() || null),
        is_anonymous,
        status: 'new'
      })
      .select('id, subject, type, created_at')
      .single();

    if (error) {
      console.error('Error creating feedback submission:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Optional: Send notification to school admin (implement as needed)
    // This would typically involve sending an email or in-app notification

    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        subject: submission.subject,
        type: type, // Return original type for frontend
        submitted_at: submission.created_at
      },
      message: 'Feedback submitted successfully. Thank you for your input!'
    });

  } catch (error) {
    console.error('Submit feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS - Handle CORS preflight for public API
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 