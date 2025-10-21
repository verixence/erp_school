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

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo allows up to 100 notifications per request
const MAX_ATTEMPTS = 3;

interface PushNotificationQueueItem {
  id: string;
  tokens: string[];
  title: string;
  body: string;
  data: any;
  attempts: number;
}

export async function POST(request: NextRequest) {
  try {
    // Get pending push notifications from queue
    const { data: pendingPushes, error: fetchError } = await supabaseAdmin
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Error fetching pending push notifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending push notifications' },
        { status: 500 }
      );
    }

    if (!pendingPushes || pendingPushes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending push notifications',
        processed: 0
      });
    }

    console.log(`Processing ${pendingPushes.length} push notifications...`);

    let totalSent = 0;
    let totalFailed = 0;

    // Process each queued notification
    for (const queueItem of pendingPushes) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('push_notification_queue')
          .update({
            status: 'processing',
            attempts: queueItem.attempts + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        // Prepare messages for Expo Push API
        const messages = queueItem.tokens.map((token: string) => ({
          to: token,
          title: queueItem.title,
          body: queueItem.body,
          data: queueItem.data || {},
          sound: 'default',
          priority: 'high',
          channelId: 'default'
        }));

        // Send in batches
        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
          const batch = messages.slice(i, i + BATCH_SIZE);

          try {
            const response = await fetch(EXPO_PUSH_API_URL, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(batch),
            });

            const result = await response.json();

            // Check result for each message
            if (result.data) {
              for (const ticketResult of result.data) {
                if (ticketResult.status === 'ok') {
                  sentCount++;
                } else {
                  failedCount++;
                  console.error('Push notification failed:', ticketResult);
                }
              }
            } else {
              failedCount += batch.length;
            }
          } catch (batchError) {
            console.error('Error sending push notification batch:', batchError);
            failedCount += batch.length;
          }
        }

        totalSent += sentCount;
        totalFailed += failedCount;

        // Update queue item status
        if (failedCount === 0) {
          // All sent successfully
          await supabaseAdmin
            .from('push_notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
        } else if (queueItem.attempts + 1 >= MAX_ATTEMPTS) {
          // Max attempts reached
          await supabaseAdmin
            .from('push_notification_queue')
            .update({
              status: 'failed',
              error_message: `Failed to send to ${failedCount} devices after ${MAX_ATTEMPTS} attempts`
            })
            .eq('id', queueItem.id);
        } else {
          // Will retry later
          await supabaseAdmin
            .from('push_notification_queue')
            .update({
              status: 'pending',
              error_message: `Partial failure: ${failedCount} devices failed, will retry`
            })
            .eq('id', queueItem.id);
        }

      } catch (error) {
        console.error(`Error processing queue item ${queueItem.id}:`, error);

        // Update with error
        await supabaseAdmin
          .from('push_notification_queue')
          .update({
            status: queueItem.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', queueItem.id);

        totalFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingPushes.length,
      sent: totalSent,
      failed: totalFailed
    });

  } catch (error) {
    console.error('Error processing push notification queue:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    const { data: stats, error } = await supabaseAdmin
      .rpc('get_push_queue_stats');

    if (error) {
      // Fallback query if RPC doesn't exist
      const { data: pendingCount } = await supabaseAdmin
        .from('push_notification_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: failedCount } = await supabaseAdmin
        .from('push_notification_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed');

      return NextResponse.json({
        success: true,
        pending: pendingCount || 0,
        failed: failedCount || 0
      });
    }

    return NextResponse.json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
