import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/admin/fees/payment-schedules/[id]/send-reminder - Manually send reminders
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Call the database function to process reminders for this specific schedule
    const { data, error } = await supabase.rpc('process_schedule_reminders', {
      p_schedule_id: id
    });

    if (error) {
      console.error('Error sending reminders:', error);
      return NextResponse.json(
        { error: 'Failed to send reminders' },
        { status: 500 }
      );
    }

    // Update last_reminder_sent_at
    await supabase
      .from('fee_collection_schedules')
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      message: 'Reminders sent successfully',
      count: data || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
