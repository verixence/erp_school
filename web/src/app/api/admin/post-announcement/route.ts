import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAnnouncementNotification } from '@/lib/push-notifications';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      school_id,
      created_by,
      target_audience, // 'all', 'parents', 'teachers', 'students'
      priority, // 'normal', 'urgent'
      expires_at
    } = body;

    // Validate required fields
    if (!title || !content || !school_id || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Create the announcement in database
    const { data: announcement, error: announcementError } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        school_id,
        created_by,
        target_audience: target_audience || 'all',
        priority: priority || 'normal',
        expires_at,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (announcementError) {
      console.error('Error creating announcement:', announcementError);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }

    // 2. Send push notifications based on target audience
    const notificationPromises = [];

    if (target_audience === 'all' || !target_audience) {
      // Send to everyone
      notificationPromises.push(
        sendAnnouncementNotification(school_id, title, content, announcement.id)
      );
    } else if (target_audience === 'parents') {
      notificationPromises.push(
        sendAnnouncementNotification(school_id, title, content, announcement.id, 'parent')
      );
    } else if (target_audience === 'teachers') {
      notificationPromises.push(
        sendAnnouncementNotification(school_id, title, content, announcement.id, 'teacher')
      );
    } else if (target_audience === 'students') {
      notificationPromises.push(
        sendAnnouncementNotification(school_id, title, content, announcement.id, 'student')
      );
    }

    // Send notifications asynchronously (don't block response)
    Promise.all(notificationPromises)
      .then(results => {
        const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
        console.log(`Announcement notifications: ${totalSent} sent, ${totalFailed} failed`);
      })
      .catch(error => {
        console.error('Error sending announcement notifications:', error);
      });

    return NextResponse.json({
      success: true,
      announcement,
      message: 'Announcement created and notifications queued'
    });

  } catch (error) {
    console.error('Error in post-announcement:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
