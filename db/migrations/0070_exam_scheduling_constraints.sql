-- Migration: Fix Exam Scheduling Issues - Add Critical Constraints
-- Purpose: Prevent duplicate exams, ensure data integrity, improve validation
-- Date: 2025-10-31

-- ============================================
-- 1. ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATE SUBJECTS
-- ============================================

-- Drop existing constraint if it exists (for re-running migration)
ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS unique_exam_paper_per_section_subject;

-- Add unique constraint: One subject per section per exam group
-- This prevents creating multiple "Mathematics" exams for same section in same exam group
ALTER TABLE public.exam_papers
ADD CONSTRAINT unique_exam_paper_per_section_subject
UNIQUE (exam_group_id, section, subject);

-- ============================================
-- 2. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for quick lookup of exam papers by group, section, and subject
CREATE INDEX IF NOT EXISTS idx_exam_papers_group_section_subject
ON public.exam_papers(exam_group_id, section, subject);

-- Index for teacher conflict checking
CREATE INDEX IF NOT EXISTS idx_exam_papers_teacher_schedule
ON public.exam_papers(teacher_id, exam_date, exam_time)
WHERE teacher_id IS NOT NULL AND exam_date IS NOT NULL AND exam_time IS NOT NULL;

-- Index for venue conflict checking
CREATE INDEX IF NOT EXISTS idx_exam_papers_venue_schedule
ON public.exam_papers(venue, exam_date, exam_time)
WHERE venue IS NOT NULL AND exam_date IS NOT NULL AND exam_time IS NOT NULL;

-- Index for section schedule lookup
CREATE INDEX IF NOT EXISTS idx_exam_papers_section_schedule
ON public.exam_papers(section, exam_date, exam_time)
WHERE exam_date IS NOT NULL AND exam_time IS NOT NULL;

-- ============================================
-- 3. ADD CHECK CONSTRAINTS FOR DATA VALIDATION
-- ============================================

-- Ensure max marks is positive and reasonable
ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS check_max_marks_valid;

ALTER TABLE public.exam_papers
ADD CONSTRAINT check_max_marks_valid
CHECK (max_marks > 0 AND max_marks <= 1000);

-- Ensure pass marks is valid
ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS check_pass_marks_valid;

ALTER TABLE public.exam_papers
ADD CONSTRAINT check_pass_marks_valid
CHECK (pass_marks >= 0 AND pass_marks < max_marks);

-- Ensure duration is positive
ALTER TABLE public.exam_papers
DROP CONSTRAINT IF EXISTS check_duration_positive;

ALTER TABLE public.exam_papers
ADD CONSTRAINT check_duration_positive
CHECK (duration_minutes > 0 AND duration_minutes <= 480); -- Max 8 hours

-- Ensure exam date is within exam group date range (will be checked by trigger)

-- ============================================
-- 4. CREATE FUNCTION TO VALIDATE EXAM DATE WITHIN RANGE
-- ============================================

CREATE OR REPLACE FUNCTION validate_exam_date_within_group()
RETURNS TRIGGER AS $$
DECLARE
  group_start_date DATE;
  group_end_date DATE;
BEGIN
  -- Get exam group date range
  SELECT start_date, end_date INTO group_start_date, group_end_date
  FROM public.exam_groups
  WHERE id = NEW.exam_group_id;

  -- Validate exam date is within range
  IF NEW.exam_date IS NOT NULL THEN
    IF NEW.exam_date < group_start_date OR NEW.exam_date > group_end_date THEN
      RAISE EXCEPTION 'Exam date must be between % and %', group_start_date, group_end_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate exam date
DROP TRIGGER IF EXISTS trigger_validate_exam_date ON public.exam_papers;

CREATE TRIGGER trigger_validate_exam_date
BEFORE INSERT OR UPDATE ON public.exam_papers
FOR EACH ROW
EXECUTE FUNCTION validate_exam_date_within_group();

-- ============================================
-- 5. CREATE FUNCTION TO LOG EXAM SCHEDULE CONFLICTS (Optional)
-- ============================================

-- Create table to log scheduling conflicts for admin review
CREATE TABLE IF NOT EXISTS public.exam_schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id UUID REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('teacher', 'venue', 'student_section', 'duplicate_subject')),
  conflict_description TEXT NOT NULL,
  conflicting_exam_paper_id UUID REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on conflicts table
ALTER TABLE public.exam_schedule_conflicts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for idempotent migration)
DROP POLICY IF EXISTS "School admins can manage exam conflicts" ON public.exam_schedule_conflicts;

-- Policy: School admins can view and manage conflicts
CREATE POLICY "School admins can manage exam conflicts" ON public.exam_schedule_conflicts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_papers ep
    JOIN public.exam_groups eg ON eg.id = ep.exam_group_id
    JOIN public.users u ON u.school_id = eg.school_id
    WHERE u.id = auth.uid()
    AND u.role IN ('school_admin', 'super_admin')
    AND ep.id = exam_schedule_conflicts.exam_paper_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_papers ep
    JOIN public.exam_groups eg ON eg.id = ep.exam_group_id
    JOIN public.users u ON u.school_id = eg.school_id
    WHERE u.id = auth.uid()
    AND u.role IN ('school_admin', 'super_admin')
    AND ep.id = exam_schedule_conflicts.exam_paper_id
  )
);

-- Indexes for conflicts table
CREATE INDEX IF NOT EXISTS idx_exam_conflicts_paper ON public.exam_schedule_conflicts(exam_paper_id);
CREATE INDEX IF NOT EXISTS idx_exam_conflicts_type ON public.exam_schedule_conflicts(conflict_type, resolved);

-- Updated_at trigger for conflicts
CREATE OR REPLACE FUNCTION update_exam_conflicts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exam_conflicts_updated_at ON public.exam_schedule_conflicts;

CREATE TRIGGER exam_conflicts_updated_at
BEFORE UPDATE ON public.exam_schedule_conflicts
FOR EACH ROW
EXECUTE FUNCTION update_exam_conflicts_updated_at();

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.exam_schedule_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION validate_exam_date_within_group() TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary of changes:
-- 1. ✅ Added UNIQUE constraint to prevent duplicate subjects per section per exam group
-- 2. ✅ Added performance indexes for conflict checking
-- 3. ✅ Added CHECK constraints for data validation (max_marks, pass_marks, duration)
-- 4. ✅ Added trigger to validate exam date within group range
-- 5. ✅ Created conflicts logging table for admin review
-- 6. ✅ Set up proper RLS policies and permissions
