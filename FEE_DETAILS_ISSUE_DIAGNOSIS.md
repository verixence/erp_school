# Fee Details Not Showing - Issue Diagnosis

## Problem
When selecting a student in the Apply Payment page, fee details are not showing up. Message displayed: "No fee demands found for this student"

## Student Selected
- **Name**: Alice Johnson
- **Admission No**: STU001
- **Grade**: NURSERY
- **Section**: A

## Database Verification ✅

### Student Fee Demands Exist
Query confirmed that Alice Johnson has **3 fee demands** in the database:

```sql
SELECT * FROM student_fee_demands
WHERE student_id = 'b67a1e0d-d690-48b2-98d8-d34f22652da5'
```

**Results**:
| Fee Structure ID | Demand Amount | Paid | Balance | Status |
|------------------|---------------|------|---------|--------|
| 6368c6e3-3a01... | ₹3,000 | ₹0 | ₹3,000 | pending |
| 5abe3b03-3d36... | ₹25,000 | ₹0 | ₹25,000 | pending |
| ae2fee12-fcc6... | ₹1,000 | ₹0 | ₹1,000 | pending |

**Total**: ₹29,000 in pending fees

## Root Cause: API Timeout ❌

### API Endpoint
`GET /api/admin/fees/demands?school_id={id}&student_id={id}`

**File**: `/web/src/app/api/admin/fees/demands/route.ts`

### Test Result
```bash
curl "http://localhost:3002/api/admin/fees/demands?school_id=...&student_id=..."
# Result: Timeout after 2 minutes
```

### Suspected Issue
The Supabase query on lines 21-50 is timing out:

```typescript
let query = supabase
  .from('student_fee_demands')
  .select(`
    *,
    students (
      id,
      full_name,
      admission_no,
      grade,
      section
    ),
    fee_structures (
      id,
      fee_categories (
        id,
        name
      )
    )
  `)
  .eq('school_id', schoolId);
```

**Possible causes**:
1. Missing foreign key relationships
2. Missing indexes on join columns
3. RLS (Row Level Security) policies blocking the query
4. Nested join performance issue

## Next Steps

### 1. Check Foreign Keys
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'student_fee_demands'
  AND tc.constraint_type = 'FOREIGN KEY';
```

### 2. Check RLS Policies
```sql
SELECT * FROM pg_policies
WHERE tablename = 'student_fee_demands';
```

### 3. Test Simplified Query
Try fetching without joins first:
```typescript
const { data, error } = await supabase
  .from('student_fee_demands')
  .select('*')
  .eq('school_id', schoolId)
  .eq('student_id', studentId);
```

Then fetch related data separately if needed.

### 4. Check Indexes
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'student_fee_demands'
ORDER BY indexname;
```

## Temporary Workaround

If RLS is the issue, we might need to use the service role or fix the RLS policies to allow the query.

## Current Status

- ✅ Section dropdown fixed (case-insensitive query)
- ✅ Student selection working
- ❌ Fee demands not loading (API timeout)
- ⏸️ Dev server restarted for testing

## Files Involved

1. `/web/src/components/fees/ApplyPayment.tsx` - Frontend component
2. `/web/src/app/api/admin/fees/demands/route.ts` - API route (timing out)
3. Database table: `student_fee_demands`
4. Related tables: `students`, `fee_structures`, `fee_categories`
