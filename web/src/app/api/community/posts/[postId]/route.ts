import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// PATCH /api/community/posts/[postId] - Update a post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
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
    const { title, body: postBody, audience, media } = body;

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (postBody !== undefined) updateData.body = postBody.trim();
    if (audience !== undefined) updateData.audience = audience;
    if (media !== undefined) {
      updateData.media_urls = media.map((m: any) => m.url);
      updateData.media = media;
    }

    // Update the post (RLS will check if user is the author)
    const { data: post, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .eq('author_id', user.id) // Ensure only author can update
      .select(`
        *,
        author:users!posts_author_id_fkey(
          id,
          first_name,
          last_name,
          role,
          display_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json(
        { error: 'Failed to update post', details: updateError.message },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error in PATCH /api/community/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/posts/[postId] - Delete a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Delete the post
    // RLS will check if user is author or school admin
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete post', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/community/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
