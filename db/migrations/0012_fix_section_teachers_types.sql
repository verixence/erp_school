-- Migration: 0012_fix_section_teachers_types.sql
-- Ensure section_teachers table is properly configured for mobile app

-- Ensure section_teachers table exists with proper structure
CREATE TABLE IF NOT EXISTS public.section_teachers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(section_id, teacher_id)
);

-- Enable RLS
ALTER TABLE public.section_teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view section_teachers in their school" ON public.section_teachers;
DROP POLICY IF EXISTS "School admins can manage section_teachers" ON public.section_teachers;
DROP POLICY IF EXISTS "Teachers can view their section assignments" ON public.section_teachers;

-- Create comprehensive RLS policies for section_teachers
CREATE POLICY "Users can view section_teachers in their school"
ON public.section_teachers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.users u ON s.school_id = u.school_id
    WHERE s.id = section_teachers.section_id
    AND u.id = auth.uid()
  )
);

CREATE POLICY "School admins can manage section_teachers"
ON public.section_teachers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.users u ON s.school_id = u.school_id
    WHERE s.id = section_teachers.section_id
    AND u.id = auth.uid()
    AND u.role IN ('school_admin', 'super_admin')
  )
);

-- Allow teachers to view their own assignments
CREATE POLICY "Teachers can view their section assignments"
ON public.section_teachers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = section_teachers.teacher_id
    AND t.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_section_teachers_section_id ON public.section_teachers(section_id);
CREATE INDEX IF NOT EXISTS idx_section_teachers_teacher_id ON public.section_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_section_teachers_created_at ON public.section_teachers(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_section_teachers_updated_at ON public.section_teachers;
CREATE TRIGGER update_section_teachers_updated_at
    BEFORE UPDATE ON public.section_teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 