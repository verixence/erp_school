import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/admin/fees/payment-schedules/bulk - Bulk actions on schedules
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const body = await request.json();
    const { action, schedule_ids } = body;

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    if (!action || !['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(schedule_ids) || schedule_ids.length === 0) {
      return NextResponse.json(
        { error: 'Schedule IDs are required' },
        { status: 400 }
      );
    }

    let error;

    if (action === 'delete') {
      // Delete schedules
      const result = await supabase
        .from('fee_collection_schedules')
        .delete()
        .in('id', schedule_ids)
        .eq('school_id', schoolId);
      error = result.error;
    } else {
      // Update status
      const status = action === 'activate' ? 'active' : 'inactive';
      const result = await supabase
        .from('fee_collection_schedules')
        .update({ status })
        .in('id', schedule_ids)
        .eq('school_id', schoolId);
      error = result.error;
    }

    if (error) {
      console.error(`Error performing bulk ${action}:`, error);
      return NextResponse.json(
        { error: `Failed to ${action} schedules` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Schedules ${action}d successfully`,
      count: schedule_ids.length
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
