import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/parent/fees/[childId] - Get all fee demands for a specific child
export async function GET(
  request: NextRequest,
  { params }: { params: { childId: string } }
) {
  try {
    const { childId } = params;
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get('academic_year');

    const supabase = await createClient();

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

    // Build query to get fee demands with related fee structure and category info
    let query = supabase
      .from('student_fee_demands')
      .select(`
        *,
        fee_structure:fee_structures (
          id,
          fee_category:fee_categories (
            id,
            name,
            description,
            is_mandatory
          ),
          payment_frequency,
          late_fee_amount,
          late_fee_days
        )
      `)
      .eq('student_id', childId)
      .order('due_date', { ascending: true });

    // Filter by academic year if provided
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

    // Calculate if any fees are overdue
    const now = new Date();
    const demandsWithStatus = demands?.map(demand => {
      const isOverdue = demand.due_date &&
                       new Date(demand.due_date) < now &&
                       demand.payment_status !== 'paid';

      return {
        ...demand,
        is_overdue: isOverdue
      };
    });

    return NextResponse.json({
      demands: demandsWithStatus || [],
      student_id: childId
    });
  } catch (error) {
    console.error('Error in GET /api/parent/fees/[childId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
