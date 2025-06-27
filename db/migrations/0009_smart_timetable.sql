-- Migration 0009: Smart Timetable Enhancements
-- Adds custom school timing settings, teacher load tracking, and conflict detection

-- 1. School Period Settings Table
CREATE TABLE IF NOT EXISTS public.school_period_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade_group TEXT NOT NULL, -- 'all', '1-5', '6-10', '11-12', etc.
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
  period_number INTEGER NOT NULL CHECK (period_number >= 1),
  period_name TEXT, -- 'Period 1', 'Lunch Break', 'Assembly', etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, grade_group, day_of_week, period_number)
);

-- 2. Teacher Load Settings Table
CREATE TABLE IF NOT EXISTS public.teacher_load_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  max_periods_per_week INTEGER DEFAULT 30,
  max_periods_per_day INTEGER DEFAULT 6,
  preferred_subjects TEXT[] DEFAULT '{}',
  unavailable_periods JSONB DEFAULT '{}', -- {day: [period_numbers]}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, teacher_id)
);

-- 3. Enhanced Periods Table (add timing and validation fields)
ALTER TABLE public.periods 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conflict_notes TEXT;

-- 4. Timetable Conflicts Log Table
CREATE TABLE IF NOT EXISTS public.timetable_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.periods(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('teacher_double_booking', 'teacher_overload', 'invalid_timing', 'subject_mismatch')),
  conflict_description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subject Requirements Table (for load analysis)
CREATE TABLE IF NOT EXISTS public.subject_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  subject TEXT NOT NULL,
  periods_per_week INTEGER NOT NULL DEFAULT 1,
  required_teacher_qualification TEXT,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, grade, subject)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_period_settings_school_grade ON public.school_period_settings(school_id, grade_group);
CREATE INDEX IF NOT EXISTS idx_school_period_settings_day_period ON public.school_period_settings(day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_teacher_load_settings_school_teacher ON public.teacher_load_settings(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_periods_timing ON public.periods(weekday, period_no, start_time);
CREATE INDEX IF NOT EXISTS idx_timetable_conflicts_school ON public.timetable_conflicts(school_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_subject_requirements_school_grade ON public.subject_requirements(school_id, grade);

-- Enable RLS
ALTER TABLE public.school_period_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_load_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_period_settings
CREATE POLICY "school_period_settings_access" ON public.school_period_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = school_period_settings.school_id)
      )
    )
  );

-- RLS Policies for teacher_load_settings
CREATE POLICY "teacher_load_settings_access" ON public.teacher_load_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = teacher_load_settings.school_id)
      )
    )
  );

-- RLS Policies for timetable_conflicts
CREATE POLICY "timetable_conflicts_access" ON public.timetable_conflicts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = timetable_conflicts.school_id)
      )
    )
  );

-- RLS Policies for subject_requirements
CREATE POLICY "subject_requirements_access" ON public.subject_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = subject_requirements.school_id)
      )
    )
  );

-- Function: Get school period configuration
CREATE OR REPLACE FUNCTION get_school_period_config(p_school_id UUID, p_grade_group TEXT DEFAULT 'all')
RETURNS TABLE (
  day_of_week INTEGER,
  day_name TEXT,
  periods JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sps.day_of_week,
    CASE sps.day_of_week 
      WHEN 0 THEN 'Monday'
      WHEN 1 THEN 'Tuesday' 
      WHEN 2 THEN 'Wednesday'
      WHEN 3 THEN 'Thursday'
      WHEN 4 THEN 'Friday'
      WHEN 5 THEN 'Saturday'
      WHEN 6 THEN 'Sunday'
    END as day_name,
    jsonb_agg(
      jsonb_build_object(
        'period_number', sps.period_number,
        'period_name', COALESCE(sps.period_name, 'Period ' || sps.period_number),
        'start_time', sps.start_time::text,
        'end_time', sps.end_time::text,
        'is_break', sps.is_break,
        'duration_minutes', EXTRACT(EPOCH FROM (sps.end_time - sps.start_time))/60
      ) ORDER BY sps.period_number
    ) as periods
  FROM public.school_period_settings sps
  WHERE sps.school_id = p_school_id 
    AND sps.grade_group IN ('all', p_grade_group)
    AND sps.is_active = TRUE
  GROUP BY sps.day_of_week
  ORDER BY sps.day_of_week;
END;
$$;

-- Function: Detect timetable conflicts
CREATE OR REPLACE FUNCTION detect_timetable_conflicts(p_school_id UUID)
RETURNS TABLE (
  conflict_type TEXT,
  conflict_description TEXT,
  severity TEXT,
  affected_periods JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear previous conflicts for this school
  DELETE FROM public.timetable_conflicts WHERE school_id = p_school_id;
  
  -- Teacher double-booking conflicts
  INSERT INTO public.timetable_conflicts (school_id, conflict_type, conflict_description, severity, created_at)
  SELECT 
    p_school_id,
    'teacher_double_booking',
    'Teacher ' || u.first_name || ' ' || u.last_name || ' is assigned to multiple periods at the same time',
    'error',
    NOW()
  FROM public.periods p1
  JOIN public.periods p2 ON p1.teacher_id = p2.teacher_id 
    AND p1.weekday = p2.weekday 
    AND p1.period_no = p2.period_no 
    AND p1.id != p2.id
  JOIN public.sections s1 ON p1.section_id = s1.id
  JOIN public.sections s2 ON p2.section_id = s2.id
  JOIN public.users u ON p1.teacher_id = u.id
  WHERE s1.school_id = p_school_id AND s2.school_id = p_school_id
  GROUP BY u.id, u.first_name, u.last_name, p1.weekday, p1.period_no;

  -- Teacher overload conflicts
  INSERT INTO public.timetable_conflicts (school_id, conflict_type, conflict_description, severity, created_at)
  SELECT 
    p_school_id,
    'teacher_overload',
    'Teacher ' || u.first_name || ' ' || u.last_name || ' has ' || COUNT(*) || ' periods (exceeds limit of ' || COALESCE(tls.max_periods_per_week, 30) || ')',
    CASE WHEN COUNT(*) > COALESCE(tls.max_periods_per_week, 30) + 5 THEN 'error' ELSE 'warning' END,
    NOW()
  FROM public.periods p
  JOIN public.sections s ON p.section_id = s.id
  JOIN public.users u ON p.teacher_id = u.id
  LEFT JOIN public.teacher_load_settings tls ON tls.teacher_id = u.id AND tls.school_id = s.school_id
  WHERE s.school_id = p_school_id AND p.teacher_id IS NOT NULL
  GROUP BY u.id, u.first_name, u.last_name, tls.max_periods_per_week
  HAVING COUNT(*) > COALESCE(tls.max_periods_per_week, 30);

  -- Return summary of conflicts
  RETURN QUERY
  SELECT 
    tc.conflict_type,
    tc.conflict_description,
    tc.severity,
    jsonb_build_object('count', COUNT(*)) as affected_periods
  FROM public.timetable_conflicts tc
  WHERE tc.school_id = p_school_id AND tc.is_resolved = FALSE
  GROUP BY tc.conflict_type, tc.conflict_description, tc.severity;
END;
$$;

-- Function: Get teacher load analysis
CREATE OR REPLACE FUNCTION get_teacher_load_analysis(p_school_id UUID)
RETURNS TABLE (
  teacher_id UUID,
  teacher_name TEXT,
  total_periods INTEGER,
  max_periods INTEGER,
  load_percentage NUMERIC,
  subjects_taught TEXT[],
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as teacher_id,
    u.first_name || ' ' || u.last_name as teacher_name,
    COALESCE(period_counts.total_periods, 0) as total_periods,
    COALESCE(tls.max_periods_per_week, 30) as max_periods,
    ROUND(
      CASE 
        WHEN COALESCE(tls.max_periods_per_week, 30) > 0 
        THEN (COALESCE(period_counts.total_periods, 0)::NUMERIC / COALESCE(tls.max_periods_per_week, 30)::NUMERIC) * 100
        ELSE 0
      END, 1
    ) as load_percentage,
    COALESCE(period_counts.subjects, '{}') as subjects_taught,
    CASE 
      WHEN COALESCE(period_counts.total_periods, 0) = 0 THEN 'unassigned'
      WHEN COALESCE(period_counts.total_periods, 0) > COALESCE(tls.max_periods_per_week, 30) THEN 'overloaded'
      WHEN COALESCE(period_counts.total_periods, 0) >= COALESCE(tls.max_periods_per_week, 30) * 0.8 THEN 'optimal'
      ELSE 'underutilized'
    END as status
  FROM public.users u
  LEFT JOIN public.teacher_load_settings tls ON tls.teacher_id = u.id AND tls.school_id = p_school_id
  LEFT JOIN (
    SELECT 
      p.teacher_id,
      COUNT(*) as total_periods,
      array_agg(DISTINCT p.subject) as subjects
    FROM public.periods p
    JOIN public.sections s ON p.section_id = s.id
    WHERE s.school_id = p_school_id AND p.teacher_id IS NOT NULL
    GROUP BY p.teacher_id
  ) period_counts ON period_counts.teacher_id = u.id
  WHERE u.school_id = p_school_id AND u.role = 'teacher'
  ORDER BY load_percentage DESC, teacher_name;
END;
$$;

-- Insert default period settings for schools (8 periods, Mon-Sat)
INSERT INTO public.school_period_settings (school_id, grade_group, day_of_week, period_number, start_time, end_time, is_break)
SELECT 
  s.id as school_id,
  'all' as grade_group,
  days.day_of_week,
  periods.period_number,
  ('08:00:00'::time + (periods.period_number - 1) * interval '45 minutes') as start_time,
  ('08:45:00'::time + (periods.period_number - 1) * interval '45 minutes') as end_time,
  FALSE as is_break
FROM public.schools s
CROSS JOIN generate_series(0, 5) AS days(day_of_week) -- Monday to Saturday
CROSS JOIN generate_series(1, 8) AS periods(period_number)
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_period_settings sps 
  WHERE sps.school_id = s.id
);

-- Insert lunch break (period 4 becomes 30-minute break)
UPDATE public.school_period_settings 
SET is_break = TRUE, 
    period_name = 'Lunch Break',
    start_time = '11:15:00',
    end_time = '11:45:00'
WHERE period_number = 4 AND grade_group = 'all';

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_school_period_settings_updated_at 
  BEFORE UPDATE ON public.school_period_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_load_settings_updated_at 
  BEFORE UPDATE ON public.teacher_load_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 