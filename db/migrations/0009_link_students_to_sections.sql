-- Migration 0009: Link Students to Sections
-- Add section_id column to students table
ALTER TABLE public.students 
ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);

-- Migrate existing students to sections based on grade and section text fields
-- This will attempt to match students to sections where grade and section match
UPDATE public.students 
SET section_id = sections.id
FROM public.sections
WHERE students.school_id = sections.school_id
  AND students.grade::integer = sections.grade
  AND students.section = sections.section
  AND students.section_id IS NULL;

-- Update RLS policies to include section-based access
-- Add policy for students to be visible by their section's class teacher
CREATE POLICY "students_section_teacher_policy" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sections s
      WHERE s.id = students.section_id
      AND s.class_teacher = auth.uid()
    )
  );

-- Note: Keep the existing grade and section text fields for backward compatibility
-- but prioritize section_id for new functionality 