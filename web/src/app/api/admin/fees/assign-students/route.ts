import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for student fee assignment
const assignStudentFeesSchema = z.object({
  assignments: z.array(
    z.object({
      student_id: z.string().uuid('Valid student ID is required').optional(),
      fee_structure_ids: z.array(z.string().uuid('Valid fee structure ID is required')),
      discount_percentage: z.number().min(0).max(100).default(0),
      discount_amount: z.number().min(0).default(0),
      discount_reason: z.string().optional(),
      custom_amount: z.number().min(0).optional()
    })
  ),
  apply_to_all: z.boolean().default(false),
  grade_filter: z.string().optional(),
  section_filter: z.string().optional(),
  overwrite_existing: z.boolean().default(false)
});

// POST /api/admin/fees/assign-students - Assign fees to students
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
    const validatedData = assignStudentFeesSchema.parse(body);

    let studentsToProcess: any[] = [];
    let assignmentResults: any[] = [];
    let errors: string[] = [];

    if (validatedData.apply_to_all) {
      // Get all students based on filters
      let query = supabase
        .from('students')
        .select('id, full_name, grade, section')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (validatedData.grade_filter) {
        query = query.eq('grade', validatedData.grade_filter);
      }

      if (validatedData.section_filter) {
        query = query.eq('section', validatedData.section_filter);
      }

      const { data: students, error: studentsError } = await query;

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return NextResponse.json(
          { error: 'Failed to fetch students' },
          { status: 500 }
        );
      }

      studentsToProcess = students?.map(student => ({
        student_id: student.id,
        student_name: student.full_name,
        grade: student.grade,
        section: student.section,
        fee_structure_ids: validatedData.assignments[0]?.fee_structure_ids || [],
        discount_percentage: validatedData.assignments[0]?.discount_percentage || 0,
        discount_amount: validatedData.assignments[0]?.discount_amount || 0,
        discount_reason: validatedData.assignments[0]?.discount_reason,
        custom_amount: validatedData.assignments[0]?.custom_amount
      })) || [];
    } else {
      // Process individual assignments
      for (const assignment of validatedData.assignments) {
        // Verify student exists and belongs to the school
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, full_name, grade, section')
          .eq('id', assignment.student_id)
          .eq('school_id', schoolId)
          .single();

        if (studentError || !student) {
          errors.push(`Student ${assignment.student_id} not found or doesn't belong to this school`);
          continue;
        }

        studentsToProcess.push({
          student_id: student.id,
          student_name: student.full_name,
          grade: student.grade,
          section: student.section,
          fee_structure_ids: assignment.fee_structure_ids,
          discount_percentage: assignment.discount_percentage,
          discount_amount: assignment.discount_amount,
          discount_reason: assignment.discount_reason,
          custom_amount: assignment.custom_amount
        });
      }
    }

    // Process each student assignment
    for (const studentData of studentsToProcess) {
      try {
        const studentAssignments: any[] = [];

        // Verify all fee structures exist and belong to the school
        for (const feeStructureId of studentData.fee_structure_ids) {
          const { data: feeStructure, error: structureError } = await supabase
            .from('fee_structures')
            .select('id, amount, fee_category_id')
            .eq('id', feeStructureId)
            .eq('school_id', schoolId)
            .single();

          if (structureError || !feeStructure) {
            errors.push(`Fee structure ${feeStructureId} not found for student ${studentData.student_name}`);
            continue;
          }

          // Check if assignment already exists
          const { data: existingAssignment } = await supabase
            .from('student_fees')
            .select('id')
            .eq('student_id', studentData.student_id)
            .eq('fee_structure_id', feeStructureId)
            .single();

          if (existingAssignment && !validatedData.overwrite_existing) {
            errors.push(`Fee already assigned to student ${studentData.student_name} for this structure`);
            continue;
          }

          // Prepare assignment data
          const assignmentData = {
            student_id: studentData.student_id,
            fee_structure_id: feeStructureId,
            discount_percentage: studentData.discount_percentage,
            discount_amount: studentData.discount_amount,
            discount_reason: studentData.discount_reason,
            custom_amount: studentData.custom_amount,
            is_active: true,
            assigned_by: '00000000-0000-0000-0000-000000000000', // TODO: Get from auth
            assigned_at: new Date().toISOString()
          };

          if (existingAssignment && validatedData.overwrite_existing) {
            // Update existing assignment
            const { data: updatedAssignment, error: updateError } = await supabase
              .from('student_fees')
              .update(assignmentData)
              .eq('id', existingAssignment.id)
              .select()
              .single();

            if (updateError) {
              errors.push(`Failed to update fee assignment for student ${studentData.student_name}: ${updateError.message}`);
            } else {
              studentAssignments.push(updatedAssignment);
            }
          } else {
            // Create new assignment
            const { data: newAssignment, error: createError } = await supabase
              .from('student_fees')
              .insert(assignmentData)
              .select()
              .single();

            if (createError) {
              errors.push(`Failed to create fee assignment for student ${studentData.student_name}: ${createError.message}`);
            } else {
              studentAssignments.push(newAssignment);
            }
          }
        }

        assignmentResults.push({
          student_id: studentData.student_id,
          student_name: studentData.student_name,
          grade: studentData.grade,
          section: studentData.section,
          assignments: studentAssignments,
          success: studentAssignments.length > 0
        });
      } catch (error) {
        console.error(`Error processing student ${studentData.student_name}:`, error);
        errors.push(`Failed to process student ${studentData.student_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successfulAssignments = assignmentResults.filter(result => result.success);
    const failedAssignments = assignmentResults.filter(result => !result.success);

    return NextResponse.json({
      success: true,
      data: {
        total_students: studentsToProcess.length,
        successful_assignments: successfulAssignments.length,
        failed_assignments: failedAssignments.length,
        results: assignmentResults,
        errors: errors
      }
    }, { status: 201 });
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

// GET /api/admin/fees/assign-students - Get student fee assignments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const studentId = searchParams.get('student_id');
    const grade = searchParams.get('grade');
    const academicYear = searchParams.get('academic_year');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('student_fees')
      .select(`
        *,
        students (
          id,
          full_name,
          grade,
          section,
          admission_no
        ),
        fee_structures (
          id,
          academic_year,
          grade,
          amount,
          payment_frequency,
          fee_categories (
            id,
            name,
            description
          )
        )
      `)
      .eq('students.school_id', schoolId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (grade) {
      query = query.eq('students.grade', grade);
    }

    if (academicYear) {
      query = query.eq('fee_structures.academic_year', academicYear);
    }

    const { data: assignments, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student fee assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}