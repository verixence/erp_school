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

// GET - Fetch gallery albums for a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get('school_id');
    const published_only = searchParams.get('published_only') === 'true';
    
    if (!school_id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('gallery_albums')
      .select(`
        *,
        images_count:gallery_images(count),
        created_by_user:users!gallery_albums_created_by_fkey(first_name, last_name)
      `)
      .eq('school_id', school_id);

    if (published_only) {
      query = query.eq('is_published', true);
    }

    query = query.order('event_date', { ascending: false })
                .order('created_at', { ascending: false });

    const { data: albums, error } = await query;

    if (error) {
      console.error('Error fetching gallery albums:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery albums' },
        { status: 500 }
      );
    }

    // Transform the data to include proper counts
    const transformedAlbums = albums?.map(album => ({
      ...album,
      images_count: album.images_count?.[0]?.count || 0,
      created_by_name: album.created_by_user ? 
        `${album.created_by_user.first_name} ${album.created_by_user.last_name}` : 
        'Unknown'
    })) || [];

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

// POST - Create a new gallery album
export async function POST(request: NextRequest) {
  try {
    const {
      school_id,
      title,
      description,
      event_date,
      event_name,
      is_published = false,
      created_by
    } = await request.json();

    // Validate required fields
    if (!school_id || !title || !created_by) {
      return NextResponse.json(
        { error: 'School ID, title, and created_by are required' },
        { status: 400 }
      );
    }

    // Validate title length
    if (title.length < 3 || title.length > 255) {
      return NextResponse.json(
        { error: 'Title must be between 3 and 255 characters' },
        { status: 400 }
      );
    }

    // Validate event_date format if provided
    if (event_date && !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
      return NextResponse.json(
        { error: 'Event date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Create the album
    const { data: album, error } = await supabaseAdmin
      .from('gallery_albums')
      .insert({
        school_id,
        title: title.trim(),
        description: description?.trim() || null,
        event_date: event_date || null,
        event_name: event_name?.trim() || null,
        is_published,
        created_by
      })
      .select(`
        *,
        created_by_user:users!gallery_albums_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error creating gallery album:', error);
      return NextResponse.json(
        { error: 'Failed to create gallery album' },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedAlbum = {
      ...album,
      images_count: 0,
      created_by_name: album.created_by_user ? 
        `${album.created_by_user.first_name} ${album.created_by_user.last_name}` : 
        'Unknown'
    };

    return NextResponse.json({
      success: true,
      data: transformedAlbum,
      message: 'Gallery album created successfully'
    });

  } catch (error) {
    console.error('Create gallery album API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a gallery album
export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      title,
      description,
      event_date,
      event_name,
      is_published,
      school_id
    } = await request.json();

    // Validate required fields
    if (!id || !school_id) {
      return NextResponse.json(
        { error: 'Album ID and school ID are required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (title !== undefined) {
      if (title.length < 3 || title.length > 255) {
        return NextResponse.json(
          { error: 'Title must be between 3 and 255 characters' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (event_date !== undefined) {
      if (event_date && !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        return NextResponse.json(
          { error: 'Event date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      updateData.event_date = event_date || null;
    }
    
    if (event_name !== undefined) {
      updateData.event_name = event_name?.trim() || null;
    }
    
    if (is_published !== undefined) {
      updateData.is_published = Boolean(is_published);
    }

    // Update the album
    const { data: album, error } = await supabaseAdmin
      .from('gallery_albums')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', school_id)
      .select(`
        *,
        images_count:gallery_images(count),
        created_by_user:users!gallery_albums_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating gallery album:', error);
      return NextResponse.json(
        { error: 'Failed to update gallery album' },
        { status: 500 }
      );
    }

    if (!album) {
      return NextResponse.json(
        { error: 'Gallery album not found or access denied' },
        { status: 404 }
      );
    }

    // Transform the response
    const transformedAlbum = {
      ...album,
      images_count: album.images_count?.[0]?.count || 0,
      created_by_name: album.created_by_user ? 
        `${album.created_by_user.first_name} ${album.created_by_user.last_name}` : 
        'Unknown'
    };

    return NextResponse.json({
      success: true,
      data: transformedAlbum,
      message: 'Gallery album updated successfully'
    });

  } catch (error) {
    console.error('Update gallery album API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a gallery album
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const school_id = searchParams.get('school_id');

    if (!id || !school_id) {
      return NextResponse.json(
        { error: 'Album ID and school ID are required' },
        { status: 400 }
      );
    }

    // First check if the album exists and get image count
    const { data: album, error: fetchError } = await supabaseAdmin
      .from('gallery_albums')
      .select(`
        id,
        title,
        images_count:gallery_images(count)
      `)
      .eq('id', id)
      .eq('school_id', school_id)
      .single();

    if (fetchError || !album) {
      return NextResponse.json(
        { error: 'Gallery album not found or access denied' },
        { status: 404 }
      );
    }

    const imageCount = album.images_count?.[0]?.count || 0;

    // Delete the album (CASCADE will delete associated images)
    const { error: deleteError } = await supabaseAdmin
      .from('gallery_albums')
      .delete()
      .eq('id', id)
      .eq('school_id', school_id);

    if (deleteError) {
      console.error('Error deleting gallery album:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete gallery album' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Gallery album "${album.title}" and ${imageCount} associated images deleted successfully`
    });

  } catch (error) {
    console.error('Delete gallery album API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 