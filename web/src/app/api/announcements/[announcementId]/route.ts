import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// PATCH /api/announcements/[announcementId] - Update an announcement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  try {
    const { announcementId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, content, target_audience, priority, is_published, media } = body;

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (priority !== undefined) updateData.priority = priority;
    if (is_published !== undefined) {
      updateData.is_published = is_published;
      // Set published_at when publishing
      if (is_published) {
        updateData.published_at = new Date().toISOString();
      }
    }
    if (media !== undefined) {
      updateData.media_urls = media.map((m: any) => m.url);
    }

    // Update the announcement (RLS will check if user is the author)
    const { data: announcement, error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', announcementId)
      .eq('created_by', user.id) // Ensure only author can update
      .select(`
        *,
        author:users!announcements_created_by_fkey(first_name, last_name, role)
      `)
      .single();

    if (updateError) {
      console.error('Error updating announcement:', updateError);
      return NextResponse.json(
        { error: 'Failed to update announcement', details: updateError.message },
        { status: 500 }
      );
    }

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Error in PATCH /api/announcements/[announcementId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[announcementId] - Delete an announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  try {
    const { announcementId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the announcement
    // RLS will check if user is author or has appropriate permissions
    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)
      .eq('created_by', user.id); // Ensure only author can delete

    if (deleteError) {
      console.error('Error deleting announcement:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete announcement', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/announcements/[announcementId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
