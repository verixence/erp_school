import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/community/posts - Get community posts
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
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.school_id) {
      console.error('Error fetching user school:', userError);
      return NextResponse.json(
        { error: 'School not found for user' },
        { status: 404 }
      );
    }

    // Get audience filter from query params
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience');

    // Fetch posts with author and reactions/comments
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(
          id,
          first_name,
          last_name,
          role,
          display_name
        ),
        reactions:post_reactions(
          emoji,
          user_id,
          created_at,
          user:users(first_name, last_name)
        ),
        comments:post_comments(
          id,
          body,
          created_at,
          user:users(first_name, last_name)
        )
      `)
      .eq('school_id', userData.school_id)
      .order('created_at', { ascending: false });

    // Apply audience filter if provided
    if (audience && audience !== 'all') {
      query = query.or(`audience.eq.${audience},audience.eq.all`);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Transform the data to include proper counts
    const transformedPosts = posts?.map(post => ({
      ...post,
      _count: {
        reactions: post.reactions?.length || 0,
        comments: post.comments?.length || 0,
      }
    })) || [];

    return NextResponse.json({ posts: transformedPosts });
  } catch (error) {
    console.error('Error in GET /api/community/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/posts - Create a new post
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

    // Check if user is allowed to create posts (school_admin or teacher)
    if (!['school_admin', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only school admins and teachers can create posts' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, body: postBody, audience, media } = body;

    // Validate required fields
    if (!title || !postBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Create the post
    const { data: post, error: createError } = await supabase
      .from('posts')
      .insert({
        school_id: userData.school_id,
        author_id: user.id,
        title: title.trim(),
        body: postBody.trim(),
        audience: audience || 'all',
        media_urls: media?.map((m: any) => m.url) || [],
        media: media || []
      })
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

    if (createError) {
      console.error('Error creating post:', createError);
      return NextResponse.json(
        { error: 'Failed to create post', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/community/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
