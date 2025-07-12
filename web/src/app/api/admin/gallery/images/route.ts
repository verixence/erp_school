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

// GET - Fetch images for an album
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const album_id = searchParams.get('album_id');
    const school_id = searchParams.get('school_id');
    
    if (!album_id) {
      return NextResponse.json(
        { error: 'Album ID is required' },
        { status: 400 }
      );
    }

    // First verify the album exists and user has access
    const { data: album, error: albumError } = await supabaseAdmin
      .from('gallery_albums')
      .select('id, title, school_id')
      .eq('id', album_id)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    // If school_id provided, verify it matches
    if (school_id && album.school_id !== school_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch images for the album
    const { data: images, error } = await supabaseAdmin
      .from('gallery_images')
      .select(`
        *,
        uploaded_by_user:users!gallery_images_uploaded_by_fkey(first_name, last_name)
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

    // Transform the data
    const transformedImages = images?.map(image => ({
      ...image,
      uploaded_by_name: image.uploaded_by_user ? 
        `${image.uploaded_by_user.first_name} ${image.uploaded_by_user.last_name}` : 
        'Unknown'
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedImages,
      album: {
        id: album.id,
        title: album.title,
        school_id: album.school_id
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

// POST - Add image record to album (image_url provided)
export async function POST(request: NextRequest) {
  try {
    const {
      album_id,
      school_id,
      image_url,
      caption,
      file_name,
      file_size,
      uploaded_by
    } = await request.json();
    
    if (!album_id || !school_id || !image_url || !uploaded_by) {
      return NextResponse.json(
        { error: 'Album ID, school ID, image URL, and uploaded_by are required' },
        { status: 400 }
      );
    }

    // Verify the album exists and user has access
    const { data: album, error: albumError } = await supabaseAdmin
      .from('gallery_albums')
      .select('id, title, school_id')
      .eq('id', album_id)
      .eq('school_id', school_id)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found or access denied' },
        { status: 404 }
      );
    }

    // Get the current max upload order
    const { data: maxOrderResult } = await supabaseAdmin
      .from('gallery_images')
      .select('upload_order')
      .eq('album_id', album_id)
      .order('upload_order', { ascending: false })
      .limit(1);

    const currentOrder = (maxOrderResult?.[0]?.upload_order || 0) + 1;

    // Save image record to database
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gallery_images')
      .insert({
        album_id,
        image_url,
        caption: caption?.trim() || null,
        file_name: file_name || null,
        file_size: file_size || null,
        uploaded_by,
        upload_order: currentOrder
      })
      .select(`
        *,
        uploaded_by_user:users!gallery_images_uploaded_by_fkey(first_name, last_name)
      `)
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to add image to album' },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedImage = {
      ...imageRecord,
      uploaded_by_name: imageRecord.uploaded_by_user ? 
        `${imageRecord.uploaded_by_user.first_name} ${imageRecord.uploaded_by_user.last_name}` : 
        'Unknown'
    };

    return NextResponse.json({
      success: true,
      data: transformedImage,
      message: 'Image added to album successfully'
    });

  } catch (error) {
    console.error('Add image API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update image details (caption, order)
export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      album_id,
      caption,
      upload_order,
      school_id
    } = await request.json();

    if (!id || !album_id) {
      return NextResponse.json(
        { error: 'Image ID and album ID are required' },
        { status: 400 }
      );
    }

    // Verify access through album
    const { data: album, error: albumError } = await supabaseAdmin
      .from('gallery_albums')
      .select('id, school_id')
      .eq('id', album_id)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    if (school_id && album.school_id !== school_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (caption !== undefined) {
      updateData.caption = caption?.trim() || null;
    }
    
    if (upload_order !== undefined) {
      updateData.upload_order = parseInt(upload_order) || 0;
    }

    // Update the image
    const { data: image, error } = await supabaseAdmin
      .from('gallery_images')
      .update(updateData)
      .eq('id', id)
      .eq('album_id', album_id)
      .select(`
        *,
        uploaded_by_user:users!gallery_images_uploaded_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating gallery image:', error);
      return NextResponse.json(
        { error: 'Failed to update gallery image' },
        { status: 500 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { error: 'Gallery image not found or access denied' },
        { status: 404 }
      );
    }

    // Transform the response
    const transformedImage = {
      ...image,
      uploaded_by_name: image.uploaded_by_user ? 
        `${image.uploaded_by_user.first_name} ${image.uploaded_by_user.last_name}` : 
        'Unknown'
    };

    return NextResponse.json({
      success: true,
      data: transformedImage,
      message: 'Gallery image updated successfully'
    });

  } catch (error) {
    console.error('Update gallery image API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const album_id = searchParams.get('album_id');
    const school_id = searchParams.get('school_id');

    if (!id || !album_id) {
      return NextResponse.json(
        { error: 'Image ID and album ID are required' },
        { status: 400 }
      );
    }

    // Verify access through album
    const { data: album, error: albumError } = await supabaseAdmin
      .from('gallery_albums')
      .select('id, school_id')
      .eq('id', album_id)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    if (school_id && album.school_id !== school_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the image details before deletion
    const { data: image, error: fetchError } = await supabaseAdmin
      .from('gallery_images')
      .select('id, image_url, file_name')
      .eq('id', id)
      .eq('album_id', album_id)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { error: 'Gallery image not found' },
        { status: 404 }
      );
    }

    // Extract storage path from URL
    const imageUrl = image.image_url;
    const urlParts = imageUrl.split('/');
    const storagePath = urlParts.slice(-4).join('/'); // gallery/school_id/album_id/filename

    // Delete from database first
    const { error: deleteError } = await supabaseAdmin
      .from('gallery_images')
      .delete()
      .eq('id', id)
      .eq('album_id', album_id);

    if (deleteError) {
      console.error('Error deleting gallery image from database:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete gallery image' },
        { status: 500 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('gallery-images')
      .remove([storagePath]);

    if (storageError) {
      console.error('Error deleting image from storage:', storageError);
      // Note: We don't fail the request since the database record is already deleted
    }

    return NextResponse.json({
      success: true,
      message: `Gallery image "${image.file_name || 'Unknown'}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete gallery image API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 