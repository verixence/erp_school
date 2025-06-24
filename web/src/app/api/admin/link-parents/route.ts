import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
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
    const body = await request.json();
    const { student_id, parent_ids } = body;

    if (!student_id || !Array.isArray(parent_ids)) {
      return NextResponse.json(
        { error: 'student_id and parent_ids array are required' },
        { status: 400 }
      );
    }

    // First, remove existing parent-student links for this student
    const { error: deleteError } = await supabase
      .from('student_parents')
      .delete()
      .eq('student_id', student_id);

    if (deleteError) {
      console.error('Error removing existing parent links:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update parent links' },
        { status: 500 }
      );
    }

    // If parent_ids is empty, we're done (just removed all links)
    if (parent_ids.length === 0) {
      return NextResponse.json({ 
        message: 'Parent links updated successfully',
        linked_count: 0
      });
    }

    // Create new parent-student links
    const linkData = parent_ids.map(parent_id => ({
      student_id,
      parent_id
    }));

    const { error: insertError } = await supabase
      .from('student_parents')
      .insert(linkData);

    if (insertError) {
      console.error('Error creating parent links:', insertError);
      return NextResponse.json(
        { error: 'Failed to create parent links' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Parent links updated successfully',
      linked_count: parent_ids.length
    });

  } catch (error) {
    console.error('Error in link-parents API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get('student_id');

    if (!student_id) {
      return NextResponse.json(
        { error: 'student_id is required' },
        { status: 400 }
      );
    }

    // Get current parent links for the student
    const { data, error } = await supabase
      .from('student_parents')
      .select(`
        parent_id,
        parent:users!student_parents_parent_id_fkey(
          id,
          first_name,
          last_name,
          email,
          relation
        )
      `)
      .eq('student_id', student_id);

    if (error) {
      console.error('Error fetching parent links:', error);
      return NextResponse.json(
        { error: 'Failed to fetch parent links' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      parents: data.map(link => link.parent)
    });

  } catch (error) {
    console.error('Error in link-parents API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 