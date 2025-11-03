import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      school_id,
      student_ids,
      from_academic_year,
      to_academic_year,
      target_grade
    } = body;

    if (!school_id || !student_ids || student_ids.length === 0 || !target_grade) {
      return NextResponse.json(
        { error: 'School ID, student IDs, and target grade are required' },
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

    // Verify all students belong to this school
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, grade, section')
      .eq('school_id', school_id)
      .in('id', student_ids);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    if (!students || students.length !== student_ids.length) {
      return NextResponse.json(
        { error: 'Some students not found or do not belong to this school' },
        { status: 400 }
      );
    }

    // Handle graduation (Class 10/12 students)
    if (target_grade === 'GRADUATED') {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          status: 'graduated',
          updated_at: new Date().toISOString()
        })
        .in('id', student_ids);

      if (updateError) {
        console.error('Error updating students:', updateError);
        return NextResponse.json(
          { error: 'Failed to mark students as graduated' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully marked ${students.length} student(s) as graduated`,
        promoted_count: students.length,
        target_grade: 'GRADUATED'
      });
    }

    // Regular promotion - update grade
    // Note: Section assignment can be done manually later or automated based on your logic
    const { error: updateError } = await supabase
      .from('students')
      .update({
        grade: target_grade,
        // Keep existing section for now - school can reassign manually
        updated_at: new Date().toISOString()
      })
      .in('id', student_ids);

    if (updateError) {
      console.error('Error promoting students:', updateError);
      return NextResponse.json(
        { error: 'Failed to promote students' },
        { status: 500 }
      );
    }

    // Log promotion activity (optional - could be stored in an audit table)
    console.log('Students promoted:', {
      school_id,
      promoted_by: user.id,
      count: students.length,
      from_grade: students[0]?.grade,
      to_grade: target_grade,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${students.length} student(s) to ${target_grade}`,
      promoted_count: students.length,
      from_grade: students[0]?.grade,
      target_grade,
      students: students.map(s => ({
        id: s.id,
        name: s.full_name,
        previous_grade: s.grade,
        new_grade: target_grade
      }))
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
