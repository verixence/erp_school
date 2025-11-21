import { SupabaseClient } from '@supabase/supabase-js';

export interface FilterParams {
  search?: string;
  grade?: string;
  section?: string;
  status?: string;
  gender?: string;
  department?: string;
  subject?: string;
  relation?: string;
  childrenCount?: string;
  [key: string]: string | undefined;
}

/**
 * Apply filters to a Supabase query builder for students
 */
export function applyStudentFilters(
  query: any,
  filters: FilterParams
) {
  // Search filter (search in multiple fields)
  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,admission_no.ilike.%${filters.search}%,student_email.ilike.%${filters.search}%`
    );
  }

  // Grade filter
  if (filters.grade) {
    const gradeValue = filters.grade;
    if (!isNaN(Number(gradeValue))) {
      // Numeric grade
      query = query.eq('grade', gradeValue);
    } else {
      // Text grade (NURSERY, LKG, UKG)
      query = query.ilike('grade', gradeValue);
    }
  }

  // Section filter
  if (filters.section) {
    query = query.eq('section', filters.section.toUpperCase());
  }

  // Status filter
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Gender filter
  if (filters.gender) {
    query = query.eq('gender', filters.gender);
  }

  return query;
}

/**
 * Apply filters to a Supabase query builder for teachers
 */
export function applyTeacherFilters(
  query: any,
  filters: FilterParams
) {
  // Search filter
  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  // Department filter
  if (filters.department) {
    query = query.eq('department', filters.department);
  }

  // Status filter
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Subject filter (search in subjects array)
  if (filters.subject) {
    query = query.contains('subjects', [filters.subject]);
  }

  return query;
}

/**
 * Apply filters to a Supabase query builder for parents
 */
export function applyParentFilters(
  query: any,
  filters: FilterParams
) {
  // Search filter
  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  // Relation filter
  if (filters.relation) {
    query = query.eq('relation', filters.relation);
  }

  // Status filter
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // For children count, we need a different approach as it requires joining with student_parents
  // This should be handled in the API route with a separate query

  return query;
}

/**
 * Build filter parameters from URLSearchParams or NextRequest
 */
export function parseFilterParams(searchParams: URLSearchParams | Record<string, string>): FilterParams {
  const params: FilterParams = {};

  const paramObj = searchParams instanceof URLSearchParams
    ? Object.fromEntries(searchParams.entries())
    : searchParams;

  // Extract all known filter keys
  const filterKeys = [
    'search', 'grade', 'section', 'status', 'gender',
    'department', 'subject', 'relation', 'childrenCount'
  ];

  filterKeys.forEach(key => {
    if (paramObj[key]) {
      params[key] = paramObj[key];
    }
  });

  return params;
}

/**
 * Apply sorting to query
 */
export function applySorting(
  query: any,
  sortBy: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return query.order(sortBy, { ascending: sortOrder === 'asc' });
}

/**
 * Apply pagination to query
 */
export function applyPagination(
  query: any,
  page: number = 1,
  pageSize: number = 50
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return query.range(from, to);
}
