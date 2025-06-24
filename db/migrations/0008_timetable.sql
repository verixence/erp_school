-- Migration 0008: Timetable and Sections
-- Create sections table
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  section TEXT NOT NULL,
  class_teacher UUID REFERENCES public.users(id),
  capacity INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, grade, section)
);

-- Create periods table
CREATE TABLE IF NOT EXISTS public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  period_no INTEGER NOT NULL CHECK (period_no BETWEEN 1 AND 8),
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, weekday, period_no)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sections_school_id ON public.sections(school_id);
CREATE INDEX IF NOT EXISTS idx_sections_class_teacher ON public.sections(class_teacher);
CREATE INDEX IF NOT EXISTS idx_periods_section_id ON public.periods(section_id);
CREATE INDEX IF NOT EXISTS idx_periods_teacher_id ON public.periods(teacher_id);
CREATE INDEX IF NOT EXISTS idx_periods_weekday_period ON public.periods(weekday, period_no);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sections
CREATE POLICY "sections_select_policy" ON public.sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher', 'parent') AND users.school_id = sections.school_id)
      )
    )
  );

CREATE POLICY "sections_insert_policy" ON public.sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'school_admin')
      AND (users.role = 'super_admin' OR users.school_id = sections.school_id)
    )
  );

CREATE POLICY "sections_update_policy" ON public.sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'school_admin')
      AND (users.role = 'super_admin' OR users.school_id = sections.school_id)
    )
  );

CREATE POLICY "sections_delete_policy" ON public.sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'school_admin')
      AND (users.role = 'super_admin' OR users.school_id = sections.school_id)
    )
  );

-- RLS Policies for periods
CREATE POLICY "periods_select_policy" ON public.periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.sections s ON s.id = periods.section_id
      WHERE u.id = auth.uid() 
      AND (
        u.role = 'super_admin' 
        OR (u.role IN ('school_admin', 'teacher', 'parent') AND u.school_id = s.school_id)
      )
    )
  );

CREATE POLICY "periods_insert_policy" ON public.periods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.sections s ON s.id = periods.section_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('super_admin', 'school_admin')
      AND (u.role = 'super_admin' OR u.school_id = s.school_id)
    )
  );

CREATE POLICY "periods_update_policy" ON public.periods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.sections s ON s.id = periods.section_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('super_admin', 'school_admin')
      AND (u.role = 'super_admin' OR u.school_id = s.school_id)
    )
  );

CREATE POLICY "periods_delete_policy" ON public.periods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.sections s ON s.id = periods.section_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('super_admin', 'school_admin')
      AND (u.role = 'super_admin' OR u.school_id = s.school_id)
    )
  );

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periods_updated_at BEFORE UPDATE ON public.periods 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 