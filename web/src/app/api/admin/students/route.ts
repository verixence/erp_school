import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/admin/students - List students
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const status = searchParams.get('status');
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    const search = searchParams.get('search');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('students')
      .select('id, full_name, admission_no, grade, section, status')
      .eq('school_id', schoolId);

    if (status) {
      query = query.eq('status', status);
    }

    if (grade) {
      query = query.eq('grade', grade);
    }

    if (section) {
      query = query.eq('section', section);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,admission_no.ilike.%${search}%`);
    }

    const { data: students, error } = await query.order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: students || [],
      count: students?.length || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
