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

// GET - Fetch images for a published album (parents/teachers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const album_id = searchParams.get('album_id');
    
    if (!album_id) {
      return NextResponse.json(
        { error: 'Album ID is required' },
        { status: 400 }
      );
    }

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

    // First verify the album exists, is published, and belongs to the user's school
    const { data: album, error: albumError } = await supabaseAdmin
      .from('gallery_albums')
      .select('id, title, school_id, is_published')
      .eq('id', album_id)
      .eq('school_id', userData.school_id)
      .eq('is_published', true)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found or not published' },
        { status: 404 }
      );
    }

    // Fetch images for the album
    const { data: images, error } = await supabaseAdmin
      .from('gallery_images')
      .select(`
        id,
        image_url,
        caption,
        file_name,
        upload_order,
        created_at
      `)
      .eq('album_id', album_id)
      .order('upload_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching gallery images:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery images' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: images || [],
      album: {
        id: album.id,
        title: album.title
      }
    });

  } catch (error) {
    console.error('Gallery images API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 