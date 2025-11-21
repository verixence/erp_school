import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  parseFilterParams,
  applyStudentFilters,
  applySorting,
  applyPagination
} from '@/lib/filter-helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Get school_id from user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (!userData?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const school_id = userData.school_id;

    // Parse filter parameters
    const filters = parseFilterParams(searchParams);

    // Parse pagination and sorting
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build query
    let query = supabase
      .from('students')
      .select(`
        *,
        section:sections(id, grade, grade_text, section)
      `, { count: 'exact' })
      .eq('school_id', school_id);

    // Apply filters
    query = applyStudentFilters(query, filters);

    // Apply sorting
    query = applySorting(query, sortBy, sortOrder);

    // Apply pagination
    query = applyPagination(query, page, pageSize);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      students: data,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('Student list error:', error);
    return NextResponse.json(
      { error: `Failed to fetch students: ${error.message}` },
      { status: 500 }
    );
  }
}
