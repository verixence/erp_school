import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/parent/receipts - Fetch receipts for parent's children
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query - RLS will automatically filter to only show receipts for parent's children
    let query = supabase
      .from('fee_receipts')
      .select('*', { count: 'exact' })
      .order('receipt_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optionally filter by specific student
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching receipts for parent:', error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      receipts: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in GET /api/parent/receipts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
