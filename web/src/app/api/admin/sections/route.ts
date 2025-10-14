import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/admin/sections - List sections
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const grade = searchParams.get('grade');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching sections for school:', schoolId, 'grade:', grade);

    let query = supabase
      .from('sections')
      .select('id, section, grade, capacity')
      .eq('school_id', schoolId);

    if (grade) {
      // Convert grade to integer for comparison since sections.grade is INTEGER
      const gradeInt = parseInt(grade);
      if (!isNaN(gradeInt)) {
        query = query.eq('grade', gradeInt);
        console.log('Filtering by grade (as integer):', gradeInt);
      } else {
        console.log('Invalid grade value:', grade);
      }
    }

    const { data: sections, error } = await query.order('section', { ascending: true });
    console.log('Sections found:', sections?.length, 'Error:', error);

    if (error) {
      console.error('Error fetching sections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: sections || [],
      count: sections?.length || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
