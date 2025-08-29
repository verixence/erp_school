import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for fee structure update
const updateFeeStructureSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required').optional(),
  grade: z.string().min(1, 'Grade is required').optional(),
  amount: z.number().min(0, 'Amount must be non-negative').optional(),
  payment_frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time']).optional(),
  due_dates: z.array(z.object({
    month: z.number().min(1).max(12),
    day: z.number().min(1).max(31)
  })).optional(),
  late_fee_amount: z.number().min(0).optional(),
  late_fee_days: z.number().min(0).optional(),
  late_fee_type: z.enum(['fixed', 'percentage']).optional(),
  is_active: z.boolean().optional()
});

// GET /api/admin/fees/structures/[id] - Get fee structure by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: structure, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error || !structure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: structure });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/fees/structures/[id] - Update fee structure
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = updateFeeStructureSchema.parse(body);

    // Check if structure exists
    const { data: existingStructure, error: fetchError } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingStructure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    // Check for conflicts if grade or academic year is being updated
    if (validatedData.grade || validatedData.academic_year) {
      const checkGrade = validatedData.grade || existingStructure.grade;
      const checkYear = validatedData.academic_year || existingStructure.academic_year;

      const { data: conflictStructure } = await supabase
        .from('fee_structures')
        .select('id')
        .eq('school_id', existingStructure.school_id)
        .eq('academic_year', checkYear)
        .eq('grade', checkGrade)
        .eq('fee_category_id', existingStructure.fee_category_id)
        .neq('id', id)
        .single();

      if (conflictStructure) {
        return NextResponse.json(
          { error: 'Fee structure already exists for this grade and category' },
          { status: 409 }
        );
      }
    }

    // Update the structure
    const { data: updatedStructure, error } = await supabase
      .from('fee_structures')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      console.error('Error updating fee structure:', error);
      return NextResponse.json(
        { error: 'Failed to update fee structure' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedStructure });
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

// DELETE /api/admin/fees/structures/[id] - Delete fee structure
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check if structure is being used in student fees
    const { data: usedInStudentFees, error: checkError } = await supabase
      .from('student_fees')
      .select('id')
      .eq('fee_structure_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking student fee usage:', checkError);
      return NextResponse.json(
        { error: 'Failed to check structure usage' },
        { status: 500 }
      );
    }

    if (usedInStudentFees && usedInStudentFees.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee structure that is assigned to students' },
        { status: 409 }
      );
    }

    // Delete the structure
    const { error } = await supabase
      .from('fee_structures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fee structure:', error);
      return NextResponse.json(
        { error: 'Failed to delete fee structure' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee structure deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}