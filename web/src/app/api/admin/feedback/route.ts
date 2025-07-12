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

// GET - Fetch feedback submissions for a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get('school_id');
    const type = searchParams.get('type'); // 'complaint', 'feedback', 'suggestion'
    const status = searchParams.get('status'); // 'new', 'in_review', 'resolved', 'closed'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!school_id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('feedback_box')
      .select(`
        *,
        submitted_by_user:users!feedback_box_submitted_by_fkey(first_name, last_name, email),
        resolved_by_user:users!feedback_box_resolved_by_fkey(first_name, last_name)
      `)
      .eq('school_id', school_id);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Error fetching feedback submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback submissions' },
        { status: 500 }
      );
    }

    // Transform the data to handle anonymous submissions
    const transformedSubmissions = submissions?.map(submission => ({
      ...submission,
      // Don't expose submitter details if anonymous
      submitted_by_name: submission.is_anonymous ? 
        'Anonymous' : 
        (submission.submitted_by_user ? 
          `${submission.submitted_by_user.first_name} ${submission.submitted_by_user.last_name}` : 
          submission.submitter_name || 'Unknown'),
      submitted_by_email: submission.is_anonymous ? 
        null : 
        (submission.submitted_by_user?.email || submission.submitter_email || null),
      resolved_by_name: submission.resolved_by_user ? 
        `${submission.resolved_by_user.first_name} ${submission.resolved_by_user.last_name}` : 
        null,
      // Remove sensitive fields for anonymous submissions
      submitted_by: submission.is_anonymous ? null : submission.submitted_by,
      submitted_by_user: submission.is_anonymous ? null : submission.submitted_by_user
    })) || [];

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('feedback_box')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', school_id);

    return NextResponse.json({
      success: true,
      data: transformedSubmissions,
      pagination: {
        total: totalCount || 0,
        offset,
        limit,
        hasMore: (totalCount || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Feedback submissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update feedback submission status
export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      school_id,
      status,
      admin_notes,
      resolved_by
    } = await request.json();

    if (!id || !school_id || !status) {
      return NextResponse.json(
        { error: 'Feedback ID, school ID, and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['new', 'in_review', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      status
    };

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes?.trim() || null;
    }

    // Set resolved details if status is resolved
    if (status === 'resolved' && resolved_by) {
      updateData.resolved_by = resolved_by;
      updateData.resolved_at = new Date().toISOString();
    } else if (status !== 'resolved') {
      updateData.resolved_by = null;
      updateData.resolved_at = null;
    }

    // Update the feedback submission
    const { data: submission, error } = await supabaseAdmin
      .from('feedback_box')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', school_id)
      .select(`
        *,
        submitted_by_user:users!feedback_box_submitted_by_fkey(first_name, last_name, email),
        resolved_by_user:users!feedback_box_resolved_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating feedback submission:', error);
      return NextResponse.json(
        { error: 'Failed to update feedback submission' },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { error: 'Feedback submission not found or access denied' },
        { status: 404 }
      );
    }

    // Transform the response
    const transformedSubmission = {
      ...submission,
      submitted_by_name: submission.is_anonymous ? 
        'Anonymous' : 
        (submission.submitted_by_user ? 
          `${submission.submitted_by_user.first_name} ${submission.submitted_by_user.last_name}` : 
          submission.submitter_name || 'Unknown'),
      submitted_by_email: submission.is_anonymous ? 
        null : 
        (submission.submitted_by_user?.email || submission.submitter_email || null),
      resolved_by_name: submission.resolved_by_user ? 
        `${submission.resolved_by_user.first_name} ${submission.resolved_by_user.last_name}` : 
        null,
      submitted_by: submission.is_anonymous ? null : submission.submitted_by,
      submitted_by_user: submission.is_anonymous ? null : submission.submitted_by_user
    };

    return NextResponse.json({
      success: true,
      data: transformedSubmission,
      message: 'Feedback submission updated successfully'
    });

  } catch (error) {
    console.error('Update feedback submission API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a feedback submission
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const school_id = searchParams.get('school_id');

    if (!id || !school_id) {
      return NextResponse.json(
        { error: 'Feedback ID and school ID are required' },
        { status: 400 }
      );
    }

    // Get the submission details before deletion
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('feedback_box')
      .select('id, subject, type')
      .eq('id', id)
      .eq('school_id', school_id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Feedback submission not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the submission
    const { error: deleteError } = await supabaseAdmin
      .from('feedback_box')
      .delete()
      .eq('id', id)
      .eq('school_id', school_id);

    if (deleteError) {
      console.error('Error deleting feedback submission:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete feedback submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Feedback submission "${submission.subject}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete feedback submission API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 