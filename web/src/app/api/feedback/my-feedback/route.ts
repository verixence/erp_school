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

// GET - Fetch user's own feedback submissions
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a client to verify the token and get user info
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user details from our users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user's feedback submissions
    const { data: feedbacks, error } = await supabaseAdmin
      .from('feedback_box')
      .select(`
        id,
        subject,
        description,
        type,
        original_type,
        status,
        created_at,
        updated_at,
        resolved_at,
        resolved_by,
        admin_notes
      `)
      .eq('submitted_by', userData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedFeedbacks = feedbacks?.map((feedback: any) => ({
      ...feedback,
      // Rename description to message for frontend compatibility
      message: feedback.description,
      // Use original_type as feedback_type, fallback to mapped type for backward compatibility
      feedback_type: feedback.original_type || feedback.type,
      // Add any additional transformations if needed
      responses: feedback.admin_notes ? [{
        id: `${feedback.id}-response`,
        message: feedback.admin_notes,
        created_at: feedback.resolved_at || feedback.updated_at,
        author: 'School Admin'
      }] : [],
      // Remove the original description field since we renamed it
      description: undefined
    })) || [];

    return NextResponse.json({
      success: true,
      feedbacks: transformedFeedbacks
    });

  } catch (error) {
    console.error('My feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 