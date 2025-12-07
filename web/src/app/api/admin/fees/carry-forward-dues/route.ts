import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { school_id, from_academic_year, to_academic_year } = body;

    if (!school_id || !from_academic_year || !to_academic_year) {
      return NextResponse.json(
        { error: 'School ID, from academic year, and to academic year are required' },
        { status: 400 }
      );
    }

    // Get current user for audit
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all fee demands from previous academic year with unpaid balance
    const { data: unpaidDemands, error: fetchError } = await supabase
      .from('student_fee_demands')
      .select(`
        *,
        students (
          id,
          full_name,
          grade,
          section
        ),
        fee_structures (
          id,
          fee_categories (
            id,
            name
          )
        )
      `)
      .eq('school_id', school_id)
      .eq('academic_year', from_academic_year)
      .in('payment_status', ['pending', 'partial'])
      .gt('balance_amount', 0);

    if (fetchError) {
      console.error('Error fetching unpaid demands:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch unpaid demands' },
        { status: 500 }
      );
    }

    if (!unpaidDemands || unpaidDemands.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unpaid balances to carry forward',
        carried_forward: 0,
        total_amount: 0
      });
    }

    // Check if any of these students already have carried forward demands for the new academic year
    const studentIds = unpaidDemands.map(d => d.student_id);
    const { data: existingDemands } = await supabase
      .from('student_fee_demands')
      .select('student_id, fee_structure_id')
      .eq('school_id', school_id)
      .eq('academic_year', to_academic_year)
      .in('student_id', studentIds);

    // Create a set of existing combinations to avoid duplicates
    const existingCombinations = new Set(
      (existingDemands || []).map(d => `${d.student_id}_${d.fee_structure_id}`)
    );

    // Create carried forward fee demands (Previous Year Dues)
    const carriedForwardDemands = unpaidDemands
      .filter(demand => {
        const combo = `${demand.student_id}_${demand.fee_structure_id}`;
        return !existingCombinations.has(combo);
      })
      .map(demand => ({
        school_id,
        student_id: demand.student_id,
        fee_structure_id: demand.fee_structure_id,
        academic_year: to_academic_year,
        original_amount: parseFloat(demand.balance_amount), // Carry forward only the balance
        adjustment_type: 'discount',
        adjustment_amount: 0,
        adjustment_reason: `Carried forward from ${from_academic_year}`,
        demand_amount: parseFloat(demand.balance_amount),
        payment_status: 'pending',
        created_by: user.id,
        updated_by: user.id,
        due_date: null // Can be set later
      }));

    if (carriedForwardDemands.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All demands already carried forward',
        carried_forward: 0,
        total_amount: 0
      });
    }

    // Insert carried forward demands
    const { data: insertedDemands, error: insertError } = await supabase
      .from('student_fee_demands')
      .insert(carriedForwardDemands)
      .select();

    if (insertError) {
      console.error('Error inserting carried forward demands:', insertError);
      return NextResponse.json(
        { error: 'Failed to carry forward dues' },
        { status: 500 }
      );
    }

    // Calculate total amount carried forward
    const totalAmount = carriedForwardDemands.reduce(
      (sum, demand) => sum + demand.demand_amount,
      0
    );

    return NextResponse.json({
      success: true,
      message: `Successfully carried forward ${carriedForwardDemands.length} fee demand(s)`,
      carried_forward: carriedForwardDemands.length,
      total_amount: totalAmount,
      data: insertedDemands
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
