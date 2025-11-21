# Filter Implementation Guide

This guide shows how to implement the filtering system on Teachers, Students, and Parents pages.

## 📋 Architecture Overview

1. **FilterBar Component** (`/src/components/FilterBar.tsx`)
   - Reusable component for all pages
   - Handles URL query parameters
   - Mobile-responsive with sheet UI
   - Visual filter chips

2. **Filter Configs** (`/src/config/filter-configs.ts`)
   - Pre-configured filters for each entity
   - Easy to customize

3. **Server-side Helpers** (`/src/lib/filter-helpers.ts`)
   - Apply filters to Supabase queries
   - Pagination and sorting utilities
   - Type-safe filter parsing

## 🚀 Example: Students Page Implementation

### Step 1: Import Required Dependencies

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import FilterBar from '@/components/FilterBar';
import { studentFilters } from '@/config/filter-configs';
```

### Step 2: Add FilterBar to Your Page

```tsx
export default function StudentsPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch students whenever filters change
  useEffect(() => {
    fetchStudents();
  }, [searchParams]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // Build query string from search params
      const query = new URLSearchParams(searchParams.toString());

      const response = await fetch(`/api/admin/students/list?${query}`);
      const data = await response.json();

      setStudents(data.students || []);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Students</h1>
        <Button>Add Student</Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={studentFilters}
        searchPlaceholder="Search by name, admission no, email..."
        onFilterChange={fetchStudents}
      />

      {/* Students Table */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <StudentsTable students={students} />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(page) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('page', page.toString());
          router.push(`?${params.toString()}`);
        }}
      />
    </div>
  );
}
```

## 🎨 UI Features

### Filter Chips
Active filters automatically appear as dismissible chips:
```
[Search: john] [Grade: 5] [Section: A] [Clear all]
```

### Mobile Responsive
- Desktop: Inline filters
- Mobile: Side sheet with all filters

### URL Persistence
Filters are stored in URL query parameters:
```
/students?search=john&grade=5&section=A&status=active
```

## 🔧 API Route Implementation

### Students API Route Example

```typescript
// /app/api/admin/students/list/route.ts
import { parseFilterParams, applyStudentFilters } from '@/lib/filter-helpers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filters = parseFilterParams(searchParams);

  let query = supabase
    .from('students')
    .select('*')
    .eq('school_id', school_id);

  // Apply filters
  query = applyStudentFilters(query, filters);

  // Execute query
  const { data, error, count } = await query;

  return NextResponse.json({
    students: data,
    pagination: { total: count, ... }
  });
}
```

## 📊 Adding Custom Filters

### Step 1: Add to Filter Config

```typescript
// /src/config/filter-configs.ts
export const studentFilters: FilterConfig[] = [
  // ... existing filters
  {
    key: 'admissionYear',
    label: 'Admission Year',
    type: 'select',
    options: [
      { value: '2024', label: '2024' },
      { value: '2023', label: '2023' },
      { value: '2022', label: '2022' },
    ],
    placeholder: 'Select year'
  }
];
```

### Step 2: Add to Filter Helper

```typescript
// /src/lib/filter-helpers.ts
export function applyStudentFilters(query: any, filters: FilterParams) {
  // ... existing filters

  // Admission year filter
  if (filters.admissionYear) {
    query = query.gte('admission_date', `${filters.admissionYear}-01-01`)
                 .lte('admission_date', `${filters.admissionYear}-12-31`);
  }

  return query;
}
```

## 🎯 Quick Implementation Checklist

### For Students Page:
- [ ] Import `FilterBar` and `studentFilters`
- [ ] Add `<FilterBar />` to page
- [ ] Create `/api/admin/students/list` route
- [ ] Use `applyStudentFilters()` in API route
- [ ] Add pagination
- [ ] Test filters

### For Teachers Page:
- [ ] Import `FilterBar` and `teacherFilters`
- [ ] Add `<FilterBar />` to page
- [ ] Create `/api/admin/teachers/list` route
- [ ] Use `applyTeacherFilters()` in API route
- [ ] Add pagination
- [ ] Test filters

### For Parents Page:
- [ ] Import `FilterBar` and `parentFilters`
- [ ] Add `<FilterBar />` to page
- [ ] Create `/api/admin/parents/list` route
- [ ] Use `applyParentFilters()` in API route
- [ ] Add pagination
- [ ] Test filters

## 🚀 Performance Optimizations

### 1. Database Indexes
Ensure these columns are indexed:
```sql
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_section ON students(section);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_gender ON students(gender);
CREATE INDEX idx_students_fullname_trgm ON students USING gin (full_name gin_trgm_ops);
```

### 2. Query Optimization
- Use `.select()` to fetch only needed columns
- Implement cursor-based pagination for large datasets
- Cache frequently used filter combinations

### 3. Client-side
- Debounced search (already implemented)
- Virtual scrolling for large lists
- Optimistic updates

## 📱 Mobile Considerations

The FilterBar automatically adapts:
- **Mobile**: Side sheet with "Filters" button
- **Desktop**: Inline dropdowns
- **Tablets**: Responsive breakpoints

## 🎨 Customization

### Custom Filter Types
You can extend FilterBar to support:
- Date range pickers
- Multi-select dropdowns
- Slider ranges
- Autocomplete search

### Styling
FilterBar uses Tailwind and shadcn/ui components, fully customizable via className props.

## 🐛 Troubleshooting

### Filters not working?
1. Check URL parameters are updating
2. Verify API route is receiving params
3. Check Supabase query is building correctly
4. Ensure database indexes exist

### Performance issues?
1. Add database indexes
2. Reduce pageSize
3. Implement virtual scrolling
4. Use cursor pagination

## 📚 Additional Features to Consider

1. **Saved Filters**: Store frequently used filter combinations
2. **Export**: Export filtered results to CSV
3. **Bulk Actions**: Perform actions on filtered records
4. **Filter Presets**: Quick filters like "New Students", "Inactive"
5. **Advanced Search**: Boolean operators, wildcards
