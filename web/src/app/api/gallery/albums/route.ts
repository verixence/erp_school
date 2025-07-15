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

// GET - Fetch published gallery albums for public viewing (parents/teachers)
export async function GET(request: NextRequest) {
  try {
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

    // Get user's school_id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.school_id) {
      return NextResponse.json(
        { error: 'User not associated with a school' },
        { status: 403 }
      );
    }

    // Fetch published albums for the user's school
    const { data: albums, error } = await supabaseAdmin
      .from('gallery_albums')
      .select(`
        *,
        images_count:gallery_images(count)
      `)
      .eq('school_id', userData.school_id)
      .eq('is_published', true)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gallery albums:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery albums' },
        { status: 500 }
      );
    }

    // Get first image for each album as cover photo
    const transformedAlbums = [];
    for (const album of albums || []) {
      const { data: firstImage } = await supabaseAdmin
        .from('gallery_images')
        .select('image_url')
        .eq('album_id', album.id)
        .order('upload_order', { ascending: true })
        .limit(1)
        .single();

      transformedAlbums.push({
        id: album.id,
        title: album.title,
        description: album.description,
        event_date: album.event_date,
        event_name: album.event_name,
        images_count: album.images_count?.[0]?.count || 0,
        created_at: album.created_at,
        cover_image: firstImage?.image_url || null
      });
    }

    return NextResponse.json({
      success: true,
      data: transformedAlbums
    });

  } catch (error) {
    console.error('Gallery albums API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 