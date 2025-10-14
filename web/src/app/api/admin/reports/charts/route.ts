import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Fetch all income transactions
    const { data: payments } = await supabase
      .from('student_fee_demands')
      .select('paid_amount, updated_at, payment_status')
      .eq('school_id', schoolId)
      .in('payment_status', ['paid', 'partial'])
      .gt('paid_amount', 0);

    // Fetch all expense transactions
    const { data: expenses } = await supabase
      .from('school_expenses')
      .select('amount, expense_date, category, status, payment_method')
      .eq('school_id', schoolId);

    // Fetch expense claims
    const { data: claims } = await supabase
      .from('expense_claims')
      .select('amount, approved_amount, expense_date, expense_category, status')
      .eq('school_id', schoolId);

    // Build monthly trend data
    const monthlyData: Record<string, { income: number; expense: number }> = {};

    // Process payments
    payments?.forEach((p: any) => {
      if (p.updated_at) {
        const month = p.updated_at.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expense: 0 };
        }
        monthlyData[month].income += parseFloat(p.paid_amount || 0);
      }
    });

    // Process expenses
    expenses?.forEach(e => {
      if (e.expense_date) {
        const month = e.expense_date.substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expense: 0 };
        }
        if (e.status === 'paid' || e.status === 'approved') {
          monthlyData[month].expense += parseFloat(e.amount);
        }
      }
    });

    // Process claims
    claims?.forEach(c => {
      if (c.expense_date) {
        const month = c.expense_date.substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expense: 0 };
        }
        if (c.status === 'paid' || c.status === 'approved') {
          monthlyData[month].expense += parseFloat(c.approved_amount || c.amount);
        }
      }
    });

    // Convert to array and sort by date
    const monthlyTrend = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income),
        expense: Math.round(data.expense),
        net: Math.round(data.income - data.expense)
      }));

    // Build expense category breakdown
    const expenseCategories: Record<string, number> = {};

    expenses?.forEach(e => {
      if (e.status === 'paid' || e.status === 'approved') {
        const cat = e.category;
        expenseCategories[cat] = (expenseCategories[cat] || 0) + parseFloat(e.amount);
      }
    });

    claims?.forEach(c => {
      if (c.status === 'paid' || c.status === 'approved') {
        const cat = `Claim - ${c.expense_category}`;
        expenseCategories[cat] = (expenseCategories[cat] || 0) +
          parseFloat(c.approved_amount || c.amount);
      }
    });

    const expenseBreakdown = Object.entries(expenseCategories)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories

    // Income sources (for now just fee payments)
    const incomeBreakdown = [
      {
        name: 'Fee Payments',
        value: Math.round(payments?.reduce((sum, p: any) => sum + parseFloat(p.paid_amount || 0), 0) || 0)
      }
    ];

    // Payment method distribution
    const paymentMethods: Record<string, number> = {};

    payments?.forEach((p: any) => {
      const method = 'Cash/Online'; // Simplified
      paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(p.paid_amount || 0);
    });

    expenses?.forEach(e => {
      if (e.status === 'paid' || e.status === 'approved') {
        const method = e.payment_method || 'Cash';
        paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(e.amount);
      }
    });

    const paymentMethodDistribution = Object.entries(paymentMethods)
      .map(([name, value]) => ({ name, value: Math.round(value) }));

    return NextResponse.json({
      monthlyTrend,
      expenseBreakdown,
      incomeBreakdown,
      paymentMethodDistribution
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
