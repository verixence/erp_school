-- Migration: Fix Marks Table Structure
-- Purpose: Add subject column and fix constraints

-- Add subject column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.marks ADD COLUMN subject text NOT NULL;
  END IF;
END $$;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_marks_student_exam ON public.marks(student_id, exam_paper_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON public.marks(subject);

-- Update RLS policies
DROP POLICY IF EXISTS "marks_super_admin_all" ON public.marks;
DROP POLICY IF EXISTS "marks_school_admin_manage" ON public.marks;
DROP POLICY IF EXISTS "marks_teacher_manage" ON public.marks;
DROP POLICY IF EXISTS "marks_parent_view" ON public.marks;

CREATE POLICY "marks_super_admin_all" ON public.marks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "marks_school_admin_manage" ON public.marks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_papers ep
      JOIN public.exam_groups eg ON ep.exam_group_id = eg.id
      JOIN public.users u ON eg.school_id = u.school_id
      WHERE ep.id = marks.exam_paper_id
      AND u.id = auth.uid()
      AND u.role = 'school_admin'
    )
  );

CREATE POLICY "marks_teacher_manage" ON public.marks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_papers ep
      JOIN public.exam_groups eg ON ep.exam_group_id = eg.id
      JOIN public.users u ON eg.school_id = u.school_id
      WHERE ep.id = marks.exam_paper_id
      AND u.id = auth.uid()
      AND u.role = 'teacher'
    )
  );

CREATE POLICY "marks_parent_view" ON public.marks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = marks.student_id
      AND s.parent_id = auth.uid()
    )
  ); 