import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/community/posts/[postId]/reactions - Toggle a reaction
export async function POST(
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
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json(
        { error: 'Emoji is required' },
        { status: 400 }
      );
    }

    // Check if reaction already exists
    const { data: existing, error: selectError } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing reaction:', selectError);
      return NextResponse.json(
        { error: 'Failed to check reaction', details: selectError.message },
        { status: 500 }
      );
    }

    if (existing) {
      // Remove reaction if it exists with same emoji
      const { error: deleteError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (deleteError) {
        console.error('Error removing reaction:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove reaction', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ action: 'removed', emoji });
    } else {
      // Remove any existing reaction with different emoji first
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      // Add new reaction
      const { error: insertError } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          emoji
        });

      if (insertError) {
        console.error('Error adding reaction:', insertError);
        return NextResponse.json(
          { error: 'Failed to add reaction', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ action: 'added', emoji });
    }
  } catch (error) {
    console.error('Error in POST /api/community/posts/[postId]/reactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
