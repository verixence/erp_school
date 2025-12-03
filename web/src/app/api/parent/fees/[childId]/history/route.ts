import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/parent/fees/[childId]/history - Get complete payment history with receipts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get('academic_year');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Fetch receipts for this student
    let receiptsQuery = supabase
      .from('fee_receipts')
      .select('*', { count: 'exact' })
      .eq('student_id', childId)
      .order('receipt_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: receipts, error: receiptsError, count } = await receiptsQuery;

    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    // Fetch all fee demands for context
    let demandsQuery = supabase
      .from('student_fee_demands')
      .select(`
        *,
        fee_structure:fee_structures (
          fee_category:fee_categories (
            name
          )
        )
      `)
      .eq('student_id', childId);

    if (academicYear) {
      demandsQuery = demandsQuery.eq('academic_year', academicYear);
    }

    const { data: demands, error: demandsError } = await demandsQuery;

    if (demandsError) {
      console.error('Error fetching demands:', demandsError);
      return NextResponse.json(
        { error: 'Failed to fetch fee demands' },
        { status: 500 }
      );
    }

    // Fetch payment transactions if any
    const { data: transactions, error: transactionsError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('student_id', childId)
      .order('initiated_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      // Not critical, continue without transactions
    }

    return NextResponse.json({
      receipts: receipts || [],
      demands: demands || [],
      transactions: transactions || [],
      total: count,
      limit,
      offset,
      student_id: childId
    });
  } catch (error) {
    console.error('Error in GET /api/parent/fees/[childId]/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
