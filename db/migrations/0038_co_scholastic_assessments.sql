-- Migration: Add Co-Scholastic Assessments Support
-- Purpose: Add table and functions for managing CBSE co-scholastic assessments

-- ============================================
-- CO-SCHOLASTIC ASSESSMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.co_scholastic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  term text CHECK (term IN ('Term1', 'Term2')) NOT NULL,
  academic_year text NOT NULL DEFAULT '2024-25',
  
  -- Co-Scholastic Activities
  oral_expression text CHECK (oral_expression IN ('A', 'B', 'C', 'D')),
  handwriting text CHECK (handwriting IN ('A', 'B', 'C', 'D')),
  general_knowledge text CHECK (general_knowledge IN ('A', 'B', 'C', 'D')),
  activity_sports text CHECK (activity_sports IN ('A', 'B', 'C', 'D')),
  
  -- Attitude and Values
  towards_teachers text CHECK (towards_teachers IN ('A', 'B', 'C', 'D')),
  towards_students text CHECK (towards_students IN ('A', 'B', 'C', 'D')),
  towards_school text CHECK (towards_school IN ('A', 'B', 'C', 'D')),
  
  -- Personal Qualities
  punctuality text CHECK (punctuality IN ('A', 'B', 'C', 'D')),
  initiative text CHECK (initiative IN ('A', 'B', 'C', 'D')),
  confidence text CHECK (confidence IN ('A', 'B', 'C', 'D')),
  neatness text CHECK (neatness IN ('A', 'B', 'C', 'D')),
  
  teacher_remarks text,
  status text CHECK (status IN ('draft', 'completed')) DEFAULT 'draft',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Ensure one assessment per student per term per academic year
  UNIQUE(school_id, student_id, term, academic_year)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_co_scholastic_school_id 
ON public.co_scholastic_assessments(school_id);

CREATE INDEX IF NOT EXISTS idx_co_scholastic_student_id 
ON public.co_scholastic_assessments(student_id);

CREATE INDEX IF NOT EXISTS idx_co_scholastic_teacher_id 
ON public.co_scholastic_assessments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_co_scholastic_term_year 
ON public.co_scholastic_assessments(school_id, term, academic_year);

CREATE INDEX IF NOT EXISTS idx_co_scholastic_status 
ON public.co_scholastic_assessments(school_id, status);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on the table
ALTER TABLE public.co_scholastic_assessments ENABLE ROW LEVEL SECURITY;

-- Super admins can view all assessments
CREATE POLICY "Super admins can view all co-scholastic assessments"
ON public.co_scholastic_assessments
FOR SELECT
USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin');

-- School admins can view their school's assessments
CREATE POLICY "School admins can view their school's co-scholastic assessments"
ON public.co_scholastic_assessments
FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM public.users 
    WHERE id = auth.uid() AND role = 'school_admin'
  )
);

-- Teachers can view and edit their own assessments
CREATE POLICY "Teachers can view and edit their own co-scholastic assessments"
ON public.co_scholastic_assessments
FOR ALL
USING (
  teacher_id = auth.uid() OR
  teacher_id IN (
    SELECT id FROM public.users 
    WHERE id = auth.uid() AND role = 'teacher'
  )
)
WITH CHECK (
  teacher_id = auth.uid() OR
  teacher_id IN (
    SELECT id FROM public.users 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Parents can view their children's assessments
CREATE POLICY "Parents can view their children's co-scholastic assessments"
ON public.co_scholastic_assessments
FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.student_parents sp ON s.id = sp.student_id
    WHERE sp.parent_id = auth.uid()
  )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if co-scholastic assessment is complete for a student
CREATE OR REPLACE FUNCTION is_co_scholastic_complete(
  p_student_id uuid,
  p_term text,
  p_academic_year text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.co_scholastic_assessments
    WHERE student_id = p_student_id
    AND term = p_term
    AND academic_year = p_academic_year
    AND status = 'completed'
  );
END;
$$; 