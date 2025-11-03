import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const type = searchParams.get('type'); // 'income', 'expense', 'all'
    const category = searchParams.get('category');
    const paymentMethod = searchParams.get('payment_method');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Collect all transactions
    const transactions: any[] = [];

    // 1. Fetch Fee Receipts (Income) - Primary source with receipt numbers
    if (!type || type === 'all' || type === 'income') {
      const { data: receipts, error: receiptsError } = await supabase
        .from('fee_receipts')
        .select(`
          id,
          receipt_no,
          receipt_date,
          student_name,
          total_amount,
          payment_method
        `)
        .eq('school_id', schoolId);

      if (!receiptsError && receipts && receipts.length > 0) {
        receipts.forEach((receipt: any) => {
          transactions.push({
            id: receipt.id,
            date: receipt.receipt_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            type: 'income',
            category: 'Fee Payment',
            description: `Fee payment from ${receipt.student_name || 'Unknown Student'}`,
            reference: receipt.receipt_no || '-',
            payment_method: receipt.payment_method || 'cash',
            amount: parseFloat(receipt.total_amount || 0),
            debit: 0,
            credit: parseFloat(receipt.total_amount || 0),
            status: 'completed',
            notes: null
          });
        });
      } else {
        // Fallback: Fetch from student_fee_demands if no receipts exist
        const { data: payments, error: paymentsError } = await supabase
          .from('student_fee_demands')
          .select(`
            id,
            student_id,
            paid_amount,
            updated_at,
            payment_status,
            students!inner (
              full_name
            )
          `)
          .eq('school_id', schoolId)
          .in('payment_status', ['paid', 'partial'])
          .gt('paid_amount', 0);

        if (!paymentsError && payments) {
          payments.forEach((payment: any) => {
            const studentName = payment.students?.full_name || 'Unknown Student';

            transactions.push({
              id: payment.id,
              date: payment.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              type: 'income',
              category: 'Fee Payment',
              description: `Fee payment from ${studentName}`,
              reference: '-',
              payment_method: 'cash',
              amount: parseFloat(payment.paid_amount || 0),
              debit: 0,
              credit: parseFloat(payment.paid_amount || 0),
              status: 'completed',
              notes: payment.payment_status === 'partial' ? 'Partial payment' : null
            });
          });
        }
      }
    }

    // 2. Fetch School Expenses (Expense)
    if (!type || type === 'all' || type === 'expense') {
      const { data: expenses, error: expensesError } = await supabase
        .from('school_expenses')
        .select('*')
        .eq('school_id', schoolId);

      if (!expensesError && expenses) {
        expenses.forEach(expense => {
          transactions.push({
            id: expense.id,
            date: expense.expense_date,
            type: 'expense',
            category: expense.category,
            description: `${expense.description}${expense.vendor_name ? ` - ${expense.vendor_name}` : ''}`,
            reference: expense.expense_number,
            payment_method: expense.payment_method || 'cash',
            amount: parseFloat(expense.amount),
            debit: parseFloat(expense.amount),
            credit: 0,
            status: expense.status,
            notes: expense.notes,
            receipt_url: expense.receipt_url
          });
        });
      }
    }

    // 3. Fetch Expense Claims (Expense)
    if (!type || type === 'all' || type === 'expense') {
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('school_id', schoolId);

      if (!claimsError && claims) {
        claims.forEach(claim => {
          transactions.push({
            id: claim.id,
            date: claim.expense_date,
            type: 'expense',
            category: `Claim - ${claim.expense_category}`,
            description: `${claim.description} - ${claim.employee_name}`,
            reference: `CLAIM-${claim.id.substring(0, 8)}`,
            payment_method: claim.payment_method || 'reimbursement',
            amount: claim.status === 'paid' || claim.status === 'approved'
              ? parseFloat(claim.approved_amount || claim.amount)
              : parseFloat(claim.amount),
            debit: claim.status === 'paid' || claim.status === 'approved'
              ? parseFloat(claim.approved_amount || claim.amount)
              : 0,
            credit: 0,
            status: claim.status,
            notes: claim.review_notes,
            receipt_url: claim.receipt_url
          });
        });
      }
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    // Apply filters
    let filteredTransactions = transactions;

    if (fromDate) {
      filteredTransactions = filteredTransactions.filter(t =>
        new Date(t.date) >= new Date(fromDate)
      );
    }

    if (toDate) {
      filteredTransactions = filteredTransactions.filter(t =>
        new Date(t.date) <= new Date(toDate)
      );
    }

    if (category) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (paymentMethod) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.payment_method === paymentMethod
      );
    }

    if (search) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.reference.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Calculate running balance
    let balance = 0;
    filteredTransactions = filteredTransactions.reverse().map(t => {
      balance += (t.credit - t.debit);
      return { ...t, balance };
    }).reverse();

    const total = filteredTransactions.length;
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

    // Calculate summary
    const summary = {
      total_transactions: total,
      total_income: filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.credit, 0),
      total_expenses: filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.debit, 0),
      net_balance: filteredTransactions
        .reduce((sum, t) => sum + (t.credit - t.debit), 0),
      by_payment_method: {} as Record<string, number>,
      by_category: {} as Record<string, { income: number; expense: number }>
    };

    // Group by payment method
    filteredTransactions.forEach(t => {
      const method = t.payment_method || 'unknown';
      summary.by_payment_method[method] = (summary.by_payment_method[method] || 0) + t.amount;
    });

    // Group by category
    filteredTransactions.forEach(t => {
      const cat = t.category;
      if (!summary.by_category[cat]) {
        summary.by_category[cat] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        summary.by_category[cat].income += t.amount;
      } else {
        summary.by_category[cat].expense += t.amount;
      }
    });

    return NextResponse.json({
      data: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
