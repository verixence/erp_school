import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// GET /api/admin/fees/demands - Get student fee demands
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const studentId = searchParams.get('student_id');
    const academicYear = searchParams.get('academic_year');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('student_fee_demands')
      .select(`
        *,
        students (
          id,
          full_name,
          admission_no,
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
      .eq('school_id', schoolId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching fee demands:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee demands' },
        { status: 500 }
      );
    }

    // Transform data to match ApplyPayment component format
    const transformedData = (data || []).map((demand: any) => ({
      id: demand.id,
      fee_structure_id: demand.fee_structure_id, // Include for matching with fee structures
      fee_type: demand.fee_structures?.fee_categories?.name || 'Unknown',
      due_date: null, // Due date is not mandatory in fee demands
      total_amount: demand.original_amount || 0,
      discount: demand.discount_amount || 0,
      demand_amount: demand.demand_amount || 0,
      paid_amount: demand.paid_amount || 0,
      balance_amount: demand.balance_amount || 0,
      payment_status: demand.payment_status || 'pending'
    }));

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/fees/demands - Save student fee demands (optimized for partial updates)
const demandSchema = z.object({
  id: z.string().uuid().optional(), // Optional ID for updates
  student_id: z.string().uuid(),
  fee_structure_id: z.string().uuid(),
  academic_year: z.string().min(1),
  original_amount: z.number().positive(),
  discount_amount: z.number().min(0),
  discount_reason: z.string().optional(),
  demand_amount: z.number().min(0) // Allow 0 when discount equals original amount
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { demands } = body;

    if (!Array.isArray(demands) || demands.length === 0) {
      return NextResponse.json(
        { error: 'Demands array is required' },
        { status: 400 }
      );
    }

    // Validate all demands
    const validatedDemands = demands.map((demand) => {
      const result = demandSchema.safeParse(demand);
      if (!result.success) {
        console.error('Validation error for demand:', demand, result.error);
        throw new Error(`Invalid demand data: ${JSON.stringify(result.error.errors)}`);
      }
      return result.data;
    });

    // Get current user for audit
    const { data: { user } } = await supabase.auth.getUser();

    // Upsert demands (insert or update if exists)
    const demandsToUpsert = validatedDemands.map((demand) => ({
      school_id: schoolId,
      student_id: demand.student_id,
      fee_structure_id: demand.fee_structure_id,
      academic_year: demand.academic_year,
      original_amount: demand.original_amount,
      discount_amount: demand.discount_amount,
      discount_reason: demand.discount_reason || '',
      demand_amount: demand.demand_amount,
      updated_by: user?.id || null
    }));

    const { data, error } = await supabase
      .from('student_fee_demands')
      .upsert(demandsToUpsert, {
        onConflict: 'school_id,student_id,fee_structure_id,academic_year',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Error saving fee demands:', error);
      return NextResponse.json(
        { error: 'Failed to save fee demands' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Fee demands saved successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
