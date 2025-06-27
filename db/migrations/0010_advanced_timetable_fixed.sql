-- Migration 0010: Advanced Timetable Features (Fixed Version)
-- Adds auto-fill engine, copy functionality, and grade-specific configurations

-- 1. Update subject_requirements table to be grade-specific
-- Drop existing constraints that might conflict
ALTER TABLE public.subject_requirements 
DROP CONSTRAINT IF EXISTS subject_requirements_school_id_grade_subject_key;

-- Add grade column if it doesn't exist and make it required
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subject_requirements' AND column_name='grade') THEN
        ALTER TABLE public.subject_requirements ADD COLUMN grade INTEGER;
    END IF;
END $$;

-- Update existing records to have a default grade if they don't
UPDATE public.subject_requirements 
SET grade = 1 
WHERE grade IS NULL;

-- Make grade NOT NULL
DO $$
BEGIN
    EXECUTE 'ALTER TABLE public.subject_requirements ALTER COLUMN grade SET NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be NOT NULL
        NULL;
END $$;

-- Add constraints only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'subject_requirements_grade_check' 
                   AND table_name = 'subject_requirements') THEN
        ALTER TABLE public.subject_requirements 
        ADD CONSTRAINT subject_requirements_grade_check CHECK (grade BETWEEN 1 AND 12);
    END IF;
END $$;

-- Update unique constraint to include grade
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'subject_requirements_school_grade_subject_key'
                   AND table_name = 'subject_requirements') THEN
        ALTER TABLE public.subject_requirements 
        ADD CONSTRAINT subject_requirements_school_grade_subject_key 
        UNIQUE(school_id, grade, subject);
    END IF;
END $$;

-- 2. Enhanced teacher subject mapping table
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grades INTEGER[] DEFAULT '{}', -- Array of grades teacher can teach
  proficiency_level TEXT DEFAULT 'competent' CHECK (proficiency_level IN ('novice', 'competent', 'expert')),
  is_preferred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, school_id, subject)
);

-- 3. Auto-fill logs for tracking and debugging
CREATE TABLE IF NOT EXISTS public.timetable_autofill_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  success_rate NUMERIC(5,2), -- Percentage of periods successfully filled
  unassigned_subjects TEXT[],
  teacher_conflicts INTEGER DEFAULT 0,
  generated_by UUID REFERENCES public.users(id),
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teacher_subjects_teacher_school') THEN
        CREATE INDEX idx_teacher_subjects_teacher_school ON public.teacher_subjects(teacher_id, school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teacher_subjects_subject') THEN
        CREATE INDEX idx_teacher_subjects_subject ON public.teacher_subjects(subject);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teacher_subjects_grades') THEN
        CREATE INDEX idx_teacher_subjects_grades ON public.teacher_subjects USING GIN(grades);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_autofill_logs_section') THEN
        CREATE INDEX idx_autofill_logs_section ON public.timetable_autofill_logs(section_id, created_at);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_autofill_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "teacher_subjects_access" ON public.teacher_subjects;
CREATE POLICY "teacher_subjects_access" ON public.teacher_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = teacher_subjects.school_id)
      )
    )
  );

DROP POLICY IF EXISTS "autofill_logs_access" ON public.timetable_autofill_logs;
CREATE POLICY "autofill_logs_access" ON public.timetable_autofill_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = autofill_logs.school_id)
      )
    )
  );

-- Insert default subject requirements for common subjects
INSERT INTO public.subject_requirements (school_id, grade, subject, periods_per_week, is_mandatory)
SELECT 
  s.id as school_id,
  g.grade,
  subj.subject,
  subj.periods_per_week,
  subj.is_mandatory
FROM public.schools s
CROSS JOIN generate_series(1, 12) g(grade)
CROSS JOIN (
  VALUES 
    ('Mathematics', 6, true),
    ('English', 5, true),
    ('Science', 4, true),
    ('Social Studies', 3, true),
    ('Physical Education', 2, true),
    ('Hindi', 3, true),
    ('Computer Science', 2, false),
    ('Art', 1, false),
    ('Music', 1, false)
) subj(subject, periods_per_week, is_mandatory)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subject_requirements sr
  WHERE sr.school_id = s.id 
    AND sr.grade = g.grade 
    AND sr.subject = subj.subject
);

-- Add success message
DO $$
BEGIN
  RAISE NOTICE 'Advanced Timetable Features migration (tables and constraints) completed successfully!';
  RAISE NOTICE 'Run the functions migration file next to add the PostgreSQL functions.';
END $$; 