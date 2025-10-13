import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/admin/classes - Get list of unique classes/grades in the school
export async function GET(request: NextRequest) {
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

    // Due to RLS policy restrictions on sections table when auth session is missing,
    // we'll query fee_structures table instead to get classes that have fees configured
    // This is more reliable and directly relevant for fee management
    const { data: structures, error: structuresError } = await supabase
      .from('fee_structures')
      .select('grade')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    console.log('Fee structures query - school_id:', schoolId);
    console.log('Structures data count:', structures?.length);
    console.log('Structures error:', structuresError);

    let grades: string[] = [];

    if (structures && structures.length > 0) {
      // Use fee_structures table - get distinct grades, convert to string
      grades = [...new Set(structures.map(s => String(s.grade)))].filter(Boolean);
      console.log('Extracted grades from fee structures:', grades);
    }

    // If no structures found, fallback to students table
    if (grades.length === 0) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('grade')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      console.log('Students fallback - count:', students?.length, 'error:', studentsError);

      if (students && students.length > 0) {
        // Get distinct grades from students
        const gradesSet = new Set<string>();
        students.forEach(student => {
          if (student.grade) {
            gradesSet.add(String(student.grade));
          }
        });
        grades = Array.from(gradesSet);
        console.log('Extracted grades from students:', grades);
      }
    }

    // Sort grades properly (handle roman numerals and numeric)
    const sortedGrades = grades.sort((a, b) => {
      // Try to extract numbers for sorting
      const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
      if (numA && numB) return numA - numB;
      return a.localeCompare(b);
    });

    // Get student count for each grade
    const classesWithCounts = await Promise.all(
      sortedGrades.map(async (grade) => {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('grade', grade)
          .eq('status', 'active');

        return {
          grade,
          total_students: count || 0
        };
      })
    );

    return NextResponse.json({
      data: classesWithCounts,
      summary: {
        total_classes: classesWithCounts.length,
        total_students: classesWithCounts.reduce((sum, cls) => sum + cls.total_students, 0)
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
