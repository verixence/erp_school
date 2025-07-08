-- Migration 0024: Homework Submissions Table
-- Adds homework_submissions table for tracking student homework submissions

-- Create homework_submissions table
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  file_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  submission_type TEXT DEFAULT 'online' CHECK (submission_type IN ('online', 'offline')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  grade TEXT,
  teacher_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework_id ON public.homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON public.homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_school_id ON public.homework_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_status ON public.homework_submissions(status);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_submitted_at ON public.homework_submissions(submitted_at);

-- Enable RLS
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access homework submissions for their school
CREATE POLICY "homework_submissions_school_access" ON public.homework_submissions
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- RLS Policy: Parents can only see their children's submissions
CREATE POLICY "homework_submissions_parent_access" ON public.homework_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.student_id = homework_submissions.student_id
      AND sp.parent_id = auth.uid()
    )
  );

-- RLS Policy: Students can only see their own submissions
CREATE POLICY "homework_submissions_student_access" ON public.homework_submissions
  FOR SELECT USING (
    student_id = auth.uid()
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_homework_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER homework_submissions_updated_at
  BEFORE UPDATE ON public.homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_submissions_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.homework_submissions TO authenticated;
GRANT ALL ON public.homework_submissions TO service_role; 