import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Process 100 notifications at a time
const MAX_ATTEMPTS = 3;

interface PushNotification {
  id: string;
  tokens: string[];
  title: string;
  body: string;
  data: any;
  status: string;
  attempts: number;
}

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

Deno.serve(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications to process', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingNotifications.length} notifications`);

    // Process each notification
    const results = await Promise.allSettled(
      pendingNotifications.map(async (notification: PushNotification) => {
        try {
          // Prepare Expo push messages
          const messages: ExpoPushMessage[] = notification.tokens.map(token => ({
            to: token,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sound: 'default',
            priority: 'high',
          }));

          // Send to Expo Push API
          const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
          });

          if (!response.ok) {
            throw new Error(`Expo API error: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          const tickets: ExpoPushTicket[] = result.data || [];

          // Check for errors in tickets
          const errors = tickets.filter(ticket => ticket.status === 'error');

          if (errors.length > 0) {
            console.error('Push notification errors:', errors);

            // Update notification as failed
            await supabase
              .from('push_notification_queue')
              .update({
                status: notification.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending',
                attempts: notification.attempts + 1,
                last_attempt_at: new Date().toISOString(),
                error_message: errors.map(e => e.message).join('; '),
              })
              .eq('id', notification.id);

            return { id: notification.id, success: false, errors };
          }

          // Mark as sent
          await supabase
            .from('push_notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          console.log(`Successfully sent notification ${notification.id}`);
          return { id: notification.id, success: true, tickets };

        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);

          // Update notification with error
          await supabase
            .from('push_notification_queue')
            .update({
              status: notification.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending',
              attempts: notification.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', notification.id);

          return { id: notification.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`Processed ${results.length} notifications: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Push notifications processed',
        total: results.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'rejected' }),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
      }
    );

  } catch (error) {
    console.error('Fatal error in push notification processor:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
