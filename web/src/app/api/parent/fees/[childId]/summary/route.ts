import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/parent/fees/[childId]/summary - Get fee summary statistics for a child
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get('academic_year');

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the user is a parent of this child
    const { data: parentRelation, error: relationError } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('student_id', childId)
      .single();

    if (relationError || !parentRelation) {
      return NextResponse.json(
        { error: 'Unauthorized - You are not a parent of this student' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('student_fee_demands')
      .select('*')
      .eq('student_id', childId);

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: demands, error: demandsError } = await query;

    if (demandsError) {
      console.error('Error fetching fee demands:', demandsError);
      return NextResponse.json(
        { error: 'Failed to fetch fee demands' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const now = new Date();
    const summary = {
      total_demand: 0,
      total_paid: 0,
      total_balance: 0,
      total_discount: 0,
      overdue_amount: 0,
      overdue_count: 0,
      paid_count: 0,
      pending_count: 0,
      partial_count: 0,
      next_due_date: null as string | null,
      next_due_amount: 0
    };

    let nextDueDemand: any = null;

    demands?.forEach(demand => {
      summary.total_demand += Number(demand.demand_amount) || 0;
      summary.total_paid += Number(demand.paid_amount) || 0;
      summary.total_balance += Number(demand.balance_amount) || 0;
      summary.total_discount += Number(demand.adjustment_amount) || 0;

      // Count by status
      if (demand.payment_status === 'paid') {
        summary.paid_count++;
      } else if (demand.payment_status === 'partial') {
        summary.partial_count++;
      } else if (demand.payment_status === 'pending') {
        summary.pending_count++;
      }

      // Check for overdue
      if (demand.due_date && new Date(demand.due_date) < now && demand.payment_status !== 'paid') {
        summary.overdue_amount += Number(demand.balance_amount) || 0;
        summary.overdue_count++;
      }

      // Find next due date
      if (demand.due_date && demand.payment_status !== 'paid') {
        const dueDate = new Date(demand.due_date);
        if (dueDate >= now) {
          if (!nextDueDemand || dueDate < new Date(nextDueDemand.due_date)) {
            nextDueDemand = demand;
          }
        }
      }
    });

    if (nextDueDemand) {
      summary.next_due_date = nextDueDemand.due_date;
      summary.next_due_amount = Number(nextDueDemand.balance_amount) || 0;
    }

    return NextResponse.json({
      summary,
      student_id: childId,
      academic_year: academicYear
    });
  } catch (error) {
    console.error('Error in GET /api/parent/fees/[childId]/summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
