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

    // Get total outstanding amount (unpaid invoices)
    const { data: outstandingData } = await supabase
      .from('fee_invoices')
      .select('due_amount')
      .eq('school_id', schoolId)
      .in('status', ['pending', 'partial', 'overdue']);

    const totalOutstanding = outstandingData?.reduce((sum, invoice) => sum + invoice.due_amount, 0) || 0;

    // Get this month's collections (payments)
    const { data: monthlyData } = await supabase
      .from('fee_payments')
      .select('amount')
      .eq('school_id', schoolId)
      .gte('payment_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .eq('status', 'completed');

    const monthlyCollections = monthlyData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get overdue count (invoices past due date)
    const { data: overdueData } = await supabase
      .from('fee_invoices')
      .select('id')
      .eq('school_id', schoolId)
      .lt('due_date', todayStr)
      .in('status', ['pending', 'partial']);

    const overdueCount = overdueData?.length || 0;

    // Get today's payments count
    const { data: todayData } = await supabase
      .from('fee_payments')
      .select('id')
      .eq('school_id', schoolId)
      .eq('payment_date', todayStr)
      .eq('status', 'completed');

    const recentPayments = todayData?.length || 0;

    // Get setup completion status
    const [categoriesCount, structuresCount, assignmentsCount] = await Promise.all([
      supabase.from('fee_categories').select('id', { count: 'exact' }).eq('school_id', schoolId),
      supabase.from('fee_structures').select('id', { count: 'exact' }).eq('school_id', schoolId),
      supabase.from('student_fees').select('id', { count: 'exact' }).eq('students.school_id', schoolId)
    ]);

    return NextResponse.json({
      data: {
        total_outstanding: totalOutstanding,
        monthly_collections: monthlyCollections,
        overdue_count: overdueCount,
        recent_payments: recentPayments,
        setup_status: {
          categories_count: categoriesCount.count || 0,
          structures_count: structuresCount.count || 0,
          assignments_count: assignmentsCount.count || 0
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