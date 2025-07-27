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

export async function POST(request: NextRequest) {
  try {
    // Get pending notifications
    const { data: pendingNotifications, error: fetchError } = await supabaseAdmin
      .rpc('get_pending_notifications');

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending notifications',
        processed: 0
      });
    }

    console.log(`Processing ${pendingNotifications.length} notifications...`);

    // Process each notification
    const processedIds: string[] = [];
    const results = [];

    for (const notification of pendingNotifications) {
      try {
        // Here you would integrate with your actual notification service
        // For now, we'll just log the notification and mark it as sent
        
        console.log(`Sending ${notification.notification_type} notification to ${notification.recipient_email}:`);
        console.log(`Subject: Online Class - ${notification.class_title}`);
        console.log(`Message: ${notification.message}`);
        
        // In a real implementation, you would send the notification via:
        // - Email service (SendGrid, AWS SES, etc.)
        // - Push notifications (Firebase, etc.)
        // - SMS service (Twilio, etc.)
        // - In-app notifications
        
        // For demonstration, we'll simulate successful sending
        processedIds.push(notification.id);
        results.push({
          id: notification.id,
          recipient: notification.recipient_email,
          type: notification.notification_type,
          status: 'sent'
        });
        
      } catch (notificationError) {
        console.error(`Failed to send notification ${notification.id}:`, notificationError);
        results.push({
          id: notification.id,
          recipient: notification.recipient_email,
          type: notification.notification_type,
          status: 'failed',
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        });
      }
    }

    // Mark successfully sent notifications as sent
    if (processedIds.length > 0) {
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .rpc('mark_notifications_sent', { notification_ids: processedIds });

      if (updateError) {
        console.error('Error marking notifications as sent:', updateError);
        return NextResponse.json(
          { error: 'Failed to update notification status' },
          { status: 500 }
        );
      }

      console.log(`Marked ${updateResult} notifications as sent`);
    }

    return NextResponse.json({
      success: true,
      processed: processedIds.length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });

  } catch (error) {
    console.error('Error processing notifications:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check pending notifications without processing them
export async function GET(request: NextRequest) {
  try {
    const { data: pendingNotifications, error } = await supabaseAdmin
      .rpc('get_pending_notifications');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingCount: pendingNotifications?.length || 0,
      notifications: pendingNotifications?.map((n: any) => ({
        id: n.id,
        type: n.notification_type,
        recipient: n.recipient_email,
        scheduledFor: n.scheduled_for,
        message: n.message
      })) || []
    });

  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 