import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/announcements - Get all announcements for school admin
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's school_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.school_id) {
      console.error('Error fetching user school:', userError);
      return NextResponse.json(
        { error: 'School not found for user' },
        { status: 404 }
      );
    }

    // Fetch all announcements for the school
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select(`
        *,
        author:users!announcements_created_by_fkey(first_name, last_name, role)
      `)
      .eq('school_id', userData.school_id)
      .order('created_at', { ascending: false });

    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcements: announcements || [] });
  } catch (error) {
    console.error('Error in GET /api/announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create a new announcement
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's school_id and role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.school_id) {
      console.error('Error fetching user school:', userError);
      return NextResponse.json(
        { error: 'School not found for user' },
        { status: 404 }
      );
    }

    // Check if user is allowed to create announcements (school_admin or teacher)
    if (!['school_admin', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only school admins and teachers can create announcements' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, content, target_audience, priority, is_published, media } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Create the announcement
    const { data: announcement, error: createError } = await supabase
      .from('announcements')
      .insert({
        school_id: userData.school_id,
        created_by: user.id,
        title: title.trim(),
        content: content.trim(),
        target_audience: target_audience || 'all',
        priority: priority || 'normal',
        is_published: is_published ?? false,
        media_urls: media?.map((m: any) => m.url) || [],
        published_at: is_published ? new Date().toISOString() : null
      })
      .select(`
        *,
        author:users!announcements_created_by_fkey(first_name, last_name, role)
      `)
      .single();

    if (createError) {
      console.error('Error creating announcement:', createError);
      return NextResponse.json(
        { error: 'Failed to create announcement', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
