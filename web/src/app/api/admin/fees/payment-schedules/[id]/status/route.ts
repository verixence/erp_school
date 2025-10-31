import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/admin/fees/payment-schedules/[id]/status - Get payment status for a schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Get payment status for all students in this schedule
    const { data, error } = await supabase
      .from('schedule_payment_status')
      .select(`
        *,
        students (
          id,
          full_name,
          admission_no,
          grade,
          section
        ),
        fee_schedule_installments (
          installment_number,
          installment_name,
          due_date
        )
      `)
      .eq('schedule_id', params.id)
      .order('payment_status', { ascending: true })
      .order('students(full_name)', { ascending: true });

    if (error) {
      console.error('Error fetching payment status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/fees/payment-schedules/[id]/status - Update schedule status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const body = await request.json();
    const { status } = body;

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('fee_collection_schedules')
      .update({ status })
      .eq('id', params.id)
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error updating status:', error);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
