-- Add teacher_id and venue columns to exam_papers table
-- Migration 0020_add_teacher_venue_to_exam_papers.sql

-- Add teacher_id column to track which teacher is assigned to invigilate
ALTER TABLE public.exam_papers 
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add venue column (keeping room_no for backward compatibility)  
ALTER TABLE public.exam_papers 
  ADD COLUMN IF NOT EXISTS venue TEXT;

-- Add index for teacher_id for better performance
CREATE INDEX IF NOT EXISTS idx_exam_papers_teacher_id ON public.exam_papers(teacher_id);

-- Add index for venue for searching/filtering
CREATE INDEX IF NOT EXISTS idx_exam_papers_venue ON public.exam_papers(venue);

-- Update RLS policies to ensure teachers can see papers they're assigned to
DROP POLICY IF EXISTS "exam_papers_school_access" ON public.exam_papers;

CREATE POLICY "exam_papers_school_access" ON public.exam_papers
  FOR ALL USING (
    auth.uid() in (
      select id from public.users 
      where school_id = exam_papers.school_id 
      and role in ('school_admin', 'teacher')
    )
    OR 
    -- Teachers can see papers they're assigned to invigilate
    (teacher_id = auth.uid())
  ); 