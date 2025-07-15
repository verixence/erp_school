-- Migration: Fix Co-Scholastic Assessments Table
-- Purpose: Rename teacher_id to assessed_by to match frontend expectations

-- Rename the column
ALTER TABLE public.co_scholastic_assessments 
RENAME COLUMN teacher_id TO assessed_by;

-- Update indexes to match new column name
DROP INDEX IF EXISTS idx_co_scholastic_teacher_id;
CREATE INDEX IF NOT EXISTS idx_co_scholastic_assessed_by 
ON public.co_scholastic_assessments(assessed_by);

-- Update RLS policies to use new column name
DROP POLICY IF EXISTS "Teachers can view and edit their own co-scholastic assessments" ON public.co_scholastic_assessments;

CREATE POLICY "Teachers can view and edit their own co-scholastic assessments"
ON public.co_scholastic_assessments
FOR ALL
USING (
  assessed_by = auth.uid() OR
  assessed_by IN (
    SELECT id FROM public.users 
    WHERE id = auth.uid() AND role = 'teacher'
  )
)
WITH CHECK (
  assessed_by = auth.uid() OR
  assessed_by IN (
    SELECT id FROM public.users 
    WHERE id = auth.uid() AND role = 'teacher'
  )
); 