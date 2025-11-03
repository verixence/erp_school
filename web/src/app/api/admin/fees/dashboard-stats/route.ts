import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/admin/fees/dashboard-stats - Get fee management dashboard statistics
export async function GET(request: NextRequest) {
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

    // Get current date info
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];

    // Get total students for this school
    const { data: studentsData } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const totalStudents = studentsData?.length || 0;

    // Get real data from student_fee_demands
    const { data: feeDemandsData } = await supabase
      .from('student_fee_demands')
      .select('student_id, demand_amount, paid_amount, balance_amount, payment_status, updated_at, due_date')
      .eq('school_id', schoolId);

    // Calculate total outstanding (sum of all balance amounts where not fully paid)
    const totalOutstanding = feeDemandsData?.reduce((sum, demand) =>
      sum + (demand.payment_status !== 'paid' ? parseFloat(demand.balance_amount || 0) : 0), 0
    ) || 0;

    // Calculate total collected (sum of all paid amounts across all demands)
    const totalCollected = feeDemandsData?.reduce((sum, demand) =>
      sum + parseFloat(demand.paid_amount || 0), 0
    ) || 0;

    // Calculate monthly collections from receipts if available
    const monthStartStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const { data: receiptsData } = await supabase
      .from('fee_receipts')
      .select('total_amount, receipt_date')
      .eq('school_id', schoolId)
      .gte('receipt_date', monthStartStr);

    // If receipts exist, use them; otherwise fall back to paid_amount from demands updated this month
    let monthlyCollections = 0;
    if (receiptsData && receiptsData.length > 0) {
      monthlyCollections = receiptsData.reduce((sum, receipt) =>
        sum + parseFloat(receipt.total_amount || 0), 0
      );
    } else {
      // Fallback: estimate from demands updated this month (not perfectly accurate but better than 0)
      const monthStartDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00`;
      monthlyCollections = feeDemandsData?.filter(d =>
        d.updated_at && d.updated_at >= monthStartDate && parseFloat(d.paid_amount || 0) > 0
      ).reduce((sum, demand) => sum + parseFloat(demand.paid_amount || 0), 0) || 0;
    }

    // Count overdue demands (demands past due_date that aren't fully paid)
    const overdueCount = feeDemandsData?.filter(d =>
      d.due_date &&
      d.due_date < todayStr &&
      d.payment_status !== 'paid' &&
      parseFloat(d.balance_amount || 0) > 0
    ).length || 0;

    // Count recent payments (receipts generated today, or demands updated today as fallback)
    let recentPayments = 0;
    if (receiptsData && receiptsData.length > 0) {
      recentPayments = receiptsData.filter(r =>
        r.receipt_date && r.receipt_date >= todayStr
      ).length;
    } else {
      recentPayments = feeDemandsData?.filter(d =>
        d.updated_at?.startsWith(todayStr) && parseFloat(d.paid_amount || 0) > 0
      ).length || 0;
    }

    // Count demands by payment status
    const paidCount = feeDemandsData?.filter(d => d.payment_status === 'paid').length || 0;
    const partialCount = feeDemandsData?.filter(d => d.payment_status === 'partial').length || 0;
    const pendingCount = feeDemandsData?.filter(d =>
      d.payment_status === 'pending' && parseFloat(d.balance_amount || 0) > 0
    ).length || 0;

    // Calculate unique students by payment status (a student might have multiple demands)
    const studentsByStatus = feeDemandsData?.reduce((acc, demand) => {
      if (!acc[demand.student_id]) {
        acc[demand.student_id] = { paid: 0, partial: 0, pending: 0 };
      }
      if (demand.payment_status === 'paid') acc[demand.student_id].paid++;
      else if (demand.payment_status === 'partial') acc[demand.student_id].partial++;
      else if (demand.payment_status === 'pending') acc[demand.student_id].pending++;
      return acc;
    }, {} as Record<string, { paid: number; partial: number; pending: number }>);

    // A student is "paid up" if all their demands are paid, "pending" if any are pending/partial
    const studentsFullyPaid = Object.values(studentsByStatus || {}).filter(s =>
      s.paid > 0 && s.partial === 0 && s.pending === 0
    ).length;
    const studentsWithPending = Object.values(studentsByStatus || {}).filter(s =>
      s.pending > 0 || s.partial > 0
    ).length;

    // Get setup completion status
    const [categoriesCount, structuresCount] = await Promise.all([
      supabase.from('fee_categories').select('id', { count: 'exact' }).eq('school_id', schoolId),
      supabase.from('fee_structures').select('id', { count: 'exact' }).eq('school_id', schoolId)
    ]);

    return NextResponse.json({
      data: {
        total_outstanding: totalOutstanding,
        total_collected: totalCollected,
        monthly_collections: monthlyCollections,
        overdue_count: overdueCount,
        recent_payments: recentPayments,
        total_students: totalStudents,
        pending_invoices: pendingCount,
        students_fully_paid: studentsFullyPaid,
        students_with_pending: studentsWithPending,
        payment_status_breakdown: {
          paid: paidCount,
          partial: partialCount,
          pending: pendingCount
        },
        setup_status: {
          categories_count: categoriesCount.count || 0,
          structures_count: structuresCount.count || 0,
          assignments_count: 0 // Will implement when student_fees table exists
        }
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}