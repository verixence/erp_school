import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/admin/grades-sections - Get unique grades and sections for a school
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

    // Get grades and sections from the sections table instead of students table
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('sections')
      .select('grade, section, grade_text')
      .eq('school_id', schoolId)
      .order('grade');

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sections' },
        { status: 500 }
      );
    }

    // Get unique values - use grade_text if available, otherwise grade
    const uniqueGrades = [...new Set(sectionsData?.map(s => s.grade_text || s.grade?.toString()).filter(Boolean))];
    const uniqueSections = [...new Set(sectionsData?.map(s => s.section).filter(Boolean))];

    return NextResponse.json({
      data: {
        grades: uniqueGrades,
        sections: uniqueSections
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