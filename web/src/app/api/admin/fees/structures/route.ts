import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for fee structure
const feeStructureSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  grade: z.string().min(1, 'Grade is required'),
  fee_category_id: z.string().uuid('Valid fee category ID is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  payment_frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time']),
  due_dates: z.array(z.object({
    month: z.number().min(1).max(12),
    day: z.number().min(1).max(31)
  })).optional(),
  late_fee_amount: z.number().min(0).default(0),
  late_fee_days: z.number().min(0).default(0),
  late_fee_type: z.enum(['fixed', 'percentage']).default('fixed'),
  is_active: z.boolean().default(true)
});

// GET /api/admin/fees/structures - List fee structures
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const academicYear = searchParams.get('academic_year');
    const grade = searchParams.get('grade');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('fee_structures')
      .select(`
        *,
        fee_categories (
          id,
          name,
          description,
          is_mandatory
        )
      `)
      .eq('school_id', schoolId);

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    if (grade) {
      query = query.eq('grade', grade);
    }

    const { data: structures, error } = await query
      .order('grade', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching fee structures:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee structures' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: structures });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/fees/structures - Create fee structure
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = feeStructureSchema.parse(body);

    // Check if fee category exists and belongs to the school
    const { data: category, error: categoryError } = await supabase
      .from('fee_categories')
      .select('id')
      .eq('id', validatedData.fee_category_id)
      .eq('school_id', schoolId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Invalid fee category' },
        { status: 400 }
      );
    }

    // Check for duplicate structure (same school, year, grade, and category)
    const { data: existingStructure } = await supabase
      .from('fee_structures')
      .select('id')
      .eq('school_id', schoolId)
      .eq('academic_year', validatedData.academic_year)
      .eq('grade', validatedData.grade)
      .eq('fee_category_id', validatedData.fee_category_id)
      .single();

    if (existingStructure) {
      return NextResponse.json(
        { error: 'Fee structure already exists for this grade and category' },
        { status: 409 }
      );
    }

    // Create the structure
    const { data: structure, error } = await supabase
      .from('fee_structures')
      .insert({
        school_id: schoolId,
        ...validatedData
      })
      .select(`
        *,
        fee_categories (
          id,
          name,
          description,
          is_mandatory
        )
      `)
      .single();

    if (error) {
      console.error('Error creating fee structure:', error);
      return NextResponse.json(
        { error: 'Failed to create fee structure' },
        { status: 500 }
      );
    }

    // Auto-assign this fee structure to all students in the grade
    try {
      // Get all students in this grade for the school
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .eq('grade', validatedData.grade);

      if (studentsError) {
        console.error('Error fetching students for auto-assignment:', studentsError);
        // Don't fail the request, just log the error
      } else if (students && students.length > 0) {
        // Get current user for audit
        const { data: { user } } = await supabase.auth.getUser();

        // Create student_fee_demands for all students
        const demands = students.map(student => ({
          school_id: schoolId,
          student_id: student.id,
          fee_structure_id: structure.id,
          academic_year: validatedData.academic_year,
          original_amount: validatedData.amount,
          discount_amount: 0,
          discount_reason: '',
          demand_amount: validatedData.amount,
          created_by: user?.id || null
        }));

        const { error: demandsError } = await supabase
          .from('student_fee_demands')
          .insert(demands);

        if (demandsError) {
          console.error('Error creating student fee demands:', demandsError);
          // Don't fail the request, just log the error
        } else {
          console.log(`Auto-assigned fee structure to ${students.length} students`);
        }
      }
    } catch (autoAssignError) {
      console.error('Error in auto-assignment:', autoAssignError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ data: structure }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}