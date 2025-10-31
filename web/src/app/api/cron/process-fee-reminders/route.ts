import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
const BATCH_SIZE = 100;

/**
 * Cron job to process fee payment reminders
 * Should be called daily (recommended: 9 AM local time)
 *
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-fee-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Fee Reminders] Starting cron job...');

    // Get reminders that need to be sent today
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .rpc('get_reminders_due_today');

    if (remindersError) {
      console.error('[Fee Reminders] Error fetching reminders:', remindersError);
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      );
    }

    if (!reminders || reminders.length === 0) {
      console.log('[Fee Reminders] No reminders due today');
      return NextResponse.json({
        success: true,
        message: 'No reminders due today',
        processed: 0
      });
    }

    console.log(`[Fee Reminders] Found ${reminders.length} reminders to process`);

    let totalSent = 0;
    let totalFailed = 0;
    const processedSchedules = new Set();

    // Process each reminder
    for (const reminder of reminders) {
      try {
        console.log(`[Fee Reminders] Processing reminder ${reminder.reminder_id} for schedule ${reminder.schedule_name}`);

        // Get unpaid students for this schedule
        const { data: students, error: studentsError } = await supabaseAdmin
          .rpc('get_unpaid_students_for_schedule', {
            p_schedule_id: reminder.schedule_id
          });

        if (studentsError) {
          console.error(`[Fee Reminders] Error fetching students:`, studentsError);
          totalFailed++;
          continue;
        }

        if (!students || students.length === 0) {
          console.log(`[Fee Reminders] No unpaid students for schedule ${reminder.schedule_name}`);
          continue;
        }

        console.log(`[Fee Reminders] Found ${students.length} unpaid students`);

        // Process each student
        for (const student of students) {
          try {
            // Check if reminder was already sent recently (within last 24 hours)
            const { data: recentLog } = await supabaseAdmin
              .from('reminder_logs')
              .select('id')
              .eq('reminder_id', reminder.reminder_id)
              .eq('student_id', student.student_id)
              .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .limit(1)
              .single();

            if (recentLog) {
              console.log(`[Fee Reminders] Skipping - reminder already sent to student ${student.student_name} in last 24h`);
              continue;
            }

            const sentChannels: string[] = [];
            let hasError = false;
            let errorMessage = '';

            // Prepare notification message
            const title = `Fee Payment Reminder`;
            const message = reminder.message_template
              ? reminder.message_template
                  .replace('{schedule_name}', reminder.schedule_name)
                  .replace('{student_name}', student.student_name)
                  .replace('{due_date}', new Date(reminder.due_date).toLocaleDateString())
                  .replace('{amount}', student.total_amount_due?.toFixed(2) || '0.00')
              : `${reminder.schedule_name} for ${student.student_name} is due on ${new Date(reminder.due_date).toLocaleDateString()}. Amount: ₹${student.total_amount_due?.toFixed(2) || '0.00'}`;

            // Send in-app notification
            if (reminder.notification_channels.includes('in_app') && student.parent_user_id) {
              try {
                const { error: notifError } = await supabaseAdmin
                  .from('notifications')
                  .insert({
                    user_id: student.parent_user_id,
                    title,
                    message,
                    type: 'fee_reminder',
                    related_entity_type: 'payment_schedule',
                    related_entity_id: reminder.schedule_id,
                    metadata: {
                      student_id: student.student_id,
                      student_name: student.student_name,
                      schedule_id: reminder.schedule_id,
                      schedule_name: reminder.schedule_name,
                      due_date: reminder.due_date,
                      amount: student.total_amount_due,
                      reminder_type: reminder.reminder_type
                    },
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                  });

                if (notifError) {
                  console.error('[Fee Reminders] Error sending in-app notification:', notifError);
                  hasError = true;
                  errorMessage += `In-app failed: ${notifError.message}; `;
                } else {
                  sentChannels.push('in_app');
                }
              } catch (e) {
                console.error('[Fee Reminders] Exception sending in-app notification:', e);
                hasError = true;
                errorMessage += `In-app exception; `;
              }
            }

            // Send push notification
            if (reminder.notification_channels.includes('push') && student.expo_push_token) {
              try {
                // Queue push notification
                const { error: pushError } = await supabaseAdmin
                  .from('push_notification_queue')
                  .insert({
                    tokens: [student.expo_push_token],
                    title,
                    body: message,
                    data: {
                      type: 'fee_reminder',
                      schedule_id: reminder.schedule_id,
                      student_id: student.student_id,
                      screen: 'Fees'
                    },
                    status: 'pending'
                  });

                if (pushError) {
                  console.error('[Fee Reminders] Error queuing push notification:', pushError);
                  hasError = true;
                  errorMessage += `Push queue failed: ${pushError.message}; `;
                } else {
                  sentChannels.push('push');
                }
              } catch (e) {
                console.error('[Fee Reminders] Exception queuing push notification:', e);
                hasError = true;
                errorMessage += `Push exception; `;
              }
            }

            // Log the reminder
            if (sentChannels.length > 0) {
              await supabaseAdmin
                .from('reminder_logs')
                .insert({
                  reminder_id: reminder.reminder_id,
                  user_id: student.parent_user_id,
                  student_id: student.student_id,
                  schedule_id: reminder.schedule_id,
                  channels: sentChannels,
                  status: hasError ? 'failed' : 'sent',
                  error_message: errorMessage || null
                });

              if (!hasError) {
                totalSent++;
              } else {
                totalFailed++;
              }
            } else {
              totalFailed++;
              console.log(`[Fee Reminders] No channels available for student ${student.student_name}`);
            }
          } catch (studentError) {
            console.error(`[Fee Reminders] Error processing student ${student.student_id}:`, studentError);
            totalFailed++;
          }
        }

        processedSchedules.add(reminder.schedule_id);
      } catch (reminderError) {
        console.error(`[Fee Reminders] Error processing reminder ${reminder.reminder_id}:`, reminderError);
        totalFailed++;
      }
    }

    // Trigger push notification processing
    if (totalSent > 0) {
      try {
        await fetch(`${request.nextUrl.origin}/api/admin/send-push-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        console.error('[Fee Reminders] Error triggering push notification processor:', e);
      }
    }

    console.log(`[Fee Reminders] Completed: ${totalSent} sent, ${totalFailed} failed, ${processedSchedules.size} schedules processed`);

    return NextResponse.json({
      success: true,
      message: 'Fee reminders processed successfully',
      stats: {
        reminders_found: reminders.length,
        schedules_processed: processedSchedules.size,
        notifications_sent: totalSent,
        notifications_failed: totalFailed
      }
    });
  } catch (error) {
    console.error('[Fee Reminders] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
