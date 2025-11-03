# 🚀 Migration Deployment Guide - Exam Scheduling Constraints

## Migration File: `db/migrations/0070_exam_scheduling_constraints.sql`

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### 1. Verify Supabase Connection
```bash
# Check your Supabase project is linked
cat web/.env.local | grep SUPABASE_URL

# Should show: https://pyzdfteicahfzyuoxgwg.supabase.co
```

### 2. Check Existing Schema
Before applying the migration, verify the current `exam_papers` table structure in Supabase dashboard:

**Go to:** Supabase Dashboard → SQL Editor → Run this query:

```sql
-- Check existing constraints on exam_papers table
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.exam_papers'::regclass
ORDER BY contype, conname;

-- Check existing indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'exam_papers'
ORDER BY indexname;
```

Expected Results:
- Should see `exam_papers_pkey` (PRIMARY KEY)
- May see some indexes from previous migrations
- Should NOT see `unique_exam_paper_per_section_subject` (we're adding this)

---

## 🎯 **DEPLOYMENT OPTIONS**

### **Option 1: Using Supabase Dashboard (Recommended for First Time)**

1. **Login to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select project: `pyzdfteicahfzyuoxgwg`

2. **Open SQL Editor**
   - Click on "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy & Paste Migration**
   - Open: `/Users/admin/Documents/GitHub/erp_school/db/migrations/0070_exam_scheduling_constraints.sql`
   - Copy entire contents
   - Paste into SQL Editor

4. **Execute Migration**
   - Click "Run" button
   - Wait for confirmation: "Success. No rows returned"

5. **Verify Migration Applied**
   Run this verification query:
   ```sql
   -- Check if unique constraint exists
   SELECT constraint_name
   FROM information_schema.table_constraints
   WHERE table_name = 'exam_papers'
     AND constraint_name = 'unique_exam_paper_per_section_subject';

   -- Should return 1 row with the constraint name
   ```

---

### **Option 2: Using Supabase CLI (For Production Workflow)**

**Prerequisites:**
```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

**Steps:**

1. **Link to Supabase Project**
   ```bash
   cd /Users/admin/Documents/GitHub/erp_school

   # Link to remote project
   supabase link --project-ref pyzdfteicahfzyuoxgwg

   # You'll be prompted for your database password
   # Enter the password from your Supabase project settings
   ```

2. **Verify Migrations Directory**
   ```bash
   # Check migrations are in correct location
   ls -la db/migrations/

   # Should see 0070_exam_scheduling_constraints.sql
   ```

3. **Push Migration to Remote Database**
   ```bash
   # DRY RUN first (see what will be applied)
   supabase db push --dry-run

   # If everything looks good, apply for real
   supabase db push
   ```

4. **Verify Migration Applied**
   ```bash
   # Check migration history
   supabase migration list

   # Should show 0070_exam_scheduling_constraints.sql as "Applied"
   ```

---

### **Option 3: Using npm Script (Quickest)**

**If you've already linked your project:**

```bash
cd /Users/admin/Documents/GitHub/erp_school/web

# Run the db:mcp script defined in package.json
pnpm db:mcp

# This runs: supabase db push --linked-project --env-file=.env.local
```

---

## 🧪 **POST-DEPLOYMENT VERIFICATION**

### 1. Test Unique Constraint

**In Supabase SQL Editor:**

```sql
-- Try to insert duplicate exam papers (should FAIL)
INSERT INTO exam_papers (exam_group_id, section, subject, school_id, max_marks)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Grade 10 A', 'Mathematics', (SELECT id FROM schools LIMIT 1), 100),
  ('00000000-0000-0000-0000-000000000001', 'Grade 10 A', 'Mathematics', (SELECT id FROM schools LIMIT 1), 100);

-- Expected Error:
-- ERROR: duplicate key value violates unique constraint "unique_exam_paper_per_section_subject"
```

### 2. Test Check Constraints

```sql
-- Try to insert invalid max_marks (should FAIL)
INSERT INTO exam_papers (exam_group_id, section, subject, school_id, max_marks)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Grade 10 A', 'Science', (SELECT id FROM schools LIMIT 1), 0);

-- Expected Error:
-- ERROR: new row for relation "exam_papers" violates check constraint "check_max_marks_valid"
```

### 3. Verify Indexes Created

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'exam_papers'
  AND indexname LIKE 'idx_exam_papers_%'
ORDER BY indexname;

-- Expected Results:
-- idx_exam_papers_group_section_subject
-- idx_exam_papers_teacher_schedule
-- idx_exam_papers_venue_schedule
-- idx_exam_papers_section_schedule
```

### 4. Test Trigger (Exam Date Validation)

```sql
-- Create a test exam group first
INSERT INTO exam_groups (school_id, name, exam_type, start_date, end_date)
VALUES
  ((SELECT id FROM schools LIMIT 1), 'Test Group', 'monthly', '2025-11-01', '2025-11-15')
RETURNING id;

-- Try to create exam paper with date OUTSIDE the group range (should FAIL)
INSERT INTO exam_papers (exam_group_id, section, subject, school_id, exam_date, max_marks)
VALUES
  ('[exam_group_id_from_above]', 'Grade 10 A', 'Physics', (SELECT id FROM schools LIMIT 1), '2025-12-01', 100);

-- Expected Error:
-- ERROR: Exam date must be between 2025-11-01 and 2025-11-15
```

---

## 🔄 **ROLLBACK (If Needed)**

If something goes wrong, you can rollback the migration:

```sql
-- Remove unique constraint
ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS unique_exam_paper_per_section_subject;

-- Remove check constraints
ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS check_max_marks_valid;

ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS check_pass_marks_valid;

ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS check_duration_positive;

-- Remove indexes
DROP INDEX IF EXISTS idx_exam_papers_group_section_subject;
DROP INDEX IF EXISTS idx_exam_papers_teacher_schedule;
DROP INDEX IF EXISTS idx_exam_papers_venue_schedule;
DROP INDEX IF EXISTS idx_exam_papers_section_schedule;

-- Remove trigger
DROP TRIGGER IF EXISTS trigger_validate_exam_date ON public.exam_papers;
DROP FUNCTION IF EXISTS validate_exam_date_within_group();

-- Remove conflicts table
DROP TABLE IF EXISTS public.exam_schedule_conflicts CASCADE;
```

---

## 📊 **MIGRATION IMPACT ASSESSMENT**

### What This Migration Does:
1. ✅ Adds UNIQUE constraint - Prevents duplicate subjects
2. ✅ Adds CHECK constraints - Validates marks and duration
3. ✅ Creates performance indexes - Speeds up conflict detection
4. ✅ Adds trigger - Validates exam dates
5. ✅ Creates conflicts table - Logs scheduling conflicts

### Potential Risks:
- **Low Risk**: Migration only adds constraints, doesn't modify existing data
- **No Data Loss**: No DROP or DELETE statements
- **Backward Compatible**: Existing queries will continue to work
- **Performance Impact**: Minimal - indexes improve performance

### If You Have Existing Duplicate Data:
The UNIQUE constraint will fail if duplicates already exist. To fix:

```sql
-- Find existing duplicates
SELECT exam_group_id, section, subject, COUNT(*)
FROM exam_papers
GROUP BY exam_group_id, section, subject
HAVING COUNT(*) > 1;

-- If duplicates found, manually resolve them before applying migration
-- Option 1: Delete duplicates
-- Option 2: Modify subject names to make them unique
```

---

## ✅ **SUCCESS CONFIRMATION**

After migration, you should see:

1. **In Supabase Dashboard:**
   - Table Editor → exam_papers → "Constraints" tab shows new constraints
   - SQL Editor runs validation queries successfully

2. **In Your Application:**
   - Exam scheduling page shows better error messages
   - Duplicate subject creation is blocked with clear error
   - Teacher/venue conflicts are detected

3. **In Frontend:**
   - File: `web/src/app/(protected)/school-admin/exams/page.tsx`
   - Enhanced validation working with database constraints
   - Error messages display correctly

---

## 🆘 **TROUBLESHOOTING**

### Error: "relation exam_papers does not exist"
**Solution:** Run the base exam migrations first:
```bash
# Apply migrations in order
0015_exams.sql
0018_exams_full.sql
0020_add_teacher_venue_to_exam_papers.sql
0035_add_cbse_exam_support.sql
0050_telangana_state_board.sql
# Then apply 0070_exam_scheduling_constraints.sql
```

### Error: "constraint already exists"
**Solution:** The migration is idempotent - it drops before creating. Safe to re-run.

### Error: "duplicate key value violates unique constraint"
**Solution:** You have existing duplicates. See "If You Have Existing Duplicate Data" section above.

---

## 📞 **NEED HELP?**

1. Check Supabase project logs: Dashboard → Logs
2. Run SQL queries in SQL Editor to debug
3. Check frontend console for detailed error messages
4. Review this guide step-by-step

---

## 🎯 **NEXT STEPS AFTER MIGRATION**

1. ✅ Test exam scheduling in School Admin portal
2. ✅ Try creating duplicate subjects (should fail gracefully)
3. ✅ Verify error messages are user-friendly
4. ✅ Generate sample report cards
5. ✅ Train school admins on new validation

---

**Migration Status:** ⏳ PENDING
**Last Updated:** October 31, 2025
**Applied By:** [Your Name]
**Applied On:** [Date/Time]

---

**Once applied, update this file with:**
- ✅ Migration Status: APPLIED
- Applied By: [Your name]
- Applied On: [Date/Time]
- Verification Results: [Success/Issues]
