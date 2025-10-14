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
      .select('demand_amount, paid_amount, balance_amount, payment_status, updated_at')
      .eq('school_id', schoolId);

    // Calculate total outstanding (sum of all balance amounts)
    const totalOutstanding = feeDemandsData?.reduce((sum, demand) =>
      sum + parseFloat(demand.balance_amount || 0), 0
    ) || 0;

    // Calculate monthly collections (all payments this month)
    const monthStartStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const monthlyCollections = feeDemandsData
      ?.filter(d =>
        d.updated_at &&
        d.updated_at >= monthStartStr &&
        parseFloat(d.paid_amount || 0) > 0
      )
      .reduce((sum, demand) => sum + parseFloat(demand.paid_amount || 0), 0) || 0;

    // Count overdue demands (pending payment status with balance)
    const overdueCount = feeDemandsData?.filter(d =>
      d.payment_status === 'pending' && parseFloat(d.balance_amount || 0) > 0
    ).length || 0;

    // Count recent payments (paid today)
    const recentPayments = feeDemandsData?.filter(d =>
      d.updated_at?.startsWith(todayStr) && parseFloat(d.paid_amount || 0) > 0
    ).length || 0;

    // Count pending invoices (demands with pending status AND actual balance due)
    const pendingInvoices = feeDemandsData?.filter(d =>
      d.payment_status === 'pending' && parseFloat(d.balance_amount || 0) > 0
    ).length || 0;

    // Get setup completion status
    const [categoriesCount, structuresCount] = await Promise.all([
      supabase.from('fee_categories').select('id', { count: 'exact' }).eq('school_id', schoolId),
      supabase.from('fee_structures').select('id', { count: 'exact' }).eq('school_id', schoolId)
    ]);

    return NextResponse.json({
      data: {
        total_outstanding: totalOutstanding,
        monthly_collections: monthlyCollections,
        overdue_count: overdueCount,
        recent_payments: recentPayments,
        total_students: totalStudents,
        pending_invoices: pendingInvoices,
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