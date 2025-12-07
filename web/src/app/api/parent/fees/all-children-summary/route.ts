import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all children for this parent
    const { data: studentParents, error: childrenError } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', user.id);

    if (childrenError) {
      console.error('Error fetching children:', childrenError);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    if (!studentParents || studentParents.length === 0) {
      return NextResponse.json({
        summary: {
          total_balance: 0,
          overdue_count: 0,
          overdue_amount: 0,
          total_paid: 0,
          total_demand: 0,
        },
        children_summaries: [],
      });
    }

    const studentIds = studentParents.map(sp => sp.student_id);

    // Get all fee demands for all children
    const { data: allDemands, error: demandsError } = await supabase
      .from('student_fee_demands')
      .select(`
        id,
        student_id,
        demand_amount,
        paid_amount,
        balance_amount,
        discount_amount,
        payment_status,
        due_date
      `)
      .in('student_id', studentIds);

    if (demandsError) {
      console.error('Error fetching fee demands:', demandsError);
      return NextResponse.json({ error: 'Failed to fetch fee demands' }, { status: 500 });
    }

    const now = new Date();

    // Aggregate data for all children
    let totalDemand = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalDiscount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let partialCount = 0;

    // Also calculate per-child summaries
    const childrenSummaries: Record<string, any> = {};

    allDemands?.forEach(demand => {
      const demandAmount = Number(demand.demand_amount || 0);
      const paidAmount = Number(demand.paid_amount || 0);
      const balanceAmount = Number(demand.balance_amount || 0);
      const discountAmount = Number(demand.discount_amount || 0);

      totalDemand += demandAmount;
      totalPaid += paidAmount;
      totalBalance += balanceAmount;
      totalDiscount += discountAmount;

      const isOverdue = demand.due_date && new Date(demand.due_date) < now && demand.payment_status !== 'paid';

      if (isOverdue) {
        overdueCount++;
        overdueAmount += balanceAmount;
      }

      if (demand.payment_status === 'paid') paidCount++;
      else if (demand.payment_status === 'partial') partialCount++;
      else if (demand.payment_status === 'pending') pendingCount++;

      // Per-child aggregation
      const studentId = demand.student_id;
      if (!childrenSummaries[studentId]) {
        childrenSummaries[studentId] = {
          student_id: studentId,
          total_demand: 0,
          total_paid: 0,
          total_balance: 0,
          total_discount: 0,
          overdue_count: 0,
          overdue_amount: 0,
          paid_count: 0,
          pending_count: 0,
          partial_count: 0,
        };
      }

      childrenSummaries[studentId].total_demand += demandAmount;
      childrenSummaries[studentId].total_paid += paidAmount;
      childrenSummaries[studentId].total_balance += balanceAmount;
      childrenSummaries[studentId].total_discount += discountAmount;

      if (isOverdue) {
        childrenSummaries[studentId].overdue_count++;
        childrenSummaries[studentId].overdue_amount += balanceAmount;
      }

      if (demand.payment_status === 'paid') childrenSummaries[studentId].paid_count++;
      else if (demand.payment_status === 'partial') childrenSummaries[studentId].partial_count++;
      else if (demand.payment_status === 'pending') childrenSummaries[studentId].pending_count++;
    });

    return NextResponse.json({
      summary: {
        total_demand: totalDemand,
        total_paid: totalPaid,
        total_balance: totalBalance,
        total_discount: totalDiscount,
        overdue_count: overdueCount,
        overdue_amount: overdueAmount,
        paid_count: paidCount,
        pending_count: pendingCount,
        partial_count: partialCount,
      },
      children_summaries: Object.values(childrenSummaries),
    });
  } catch (error) {
    console.error('Error in all-children-summary API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
