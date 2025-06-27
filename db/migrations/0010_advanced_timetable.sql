-- Migration 0010: Advanced Timetable Features
-- Adds auto-fill engine, copy functionality, and grade-specific configurations

-- 1. Update subject_requirements table to be grade-specific
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

-- Make grade NOT NULL and add constraint
ALTER TABLE public.subject_requirements 
ALTER COLUMN grade SET NOT NULL;

-- Add constraints only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'subject_requirements_grade_check') THEN
        ALTER TABLE public.subject_requirements 
        ADD CONSTRAINT subject_requirements_grade_check CHECK (grade BETWEEN 1 AND 12);
    END IF;
END $$;

-- Update unique constraint to include grade
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'subject_requirements_school_grade_subject_key') THEN
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

-- 3. Timetable generation templates table
CREATE TABLE IF NOT EXISTS public.timetable_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_group TEXT NOT NULL, -- '1-5', '6-10', '11-12', etc.
  template_data JSONB NOT NULL, -- Stores the period structure and rules
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Auto-fill logs for tracking and debugging
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_school ON public.teacher_subjects(teacher_id, school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects(subject);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_grades ON public.teacher_subjects USING GIN(grades);
CREATE INDEX IF NOT EXISTS idx_timetable_templates_school_grade ON public.timetable_templates(school_id, grade_group);
CREATE INDEX IF NOT EXISTS idx_autofill_logs_section ON public.timetable_autofill_logs(section_id, created_at);

-- Enable RLS
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_autofill_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

CREATE POLICY "timetable_templates_access" ON public.timetable_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'super_admin' 
        OR (users.role IN ('school_admin', 'teacher') AND users.school_id = timetable_templates.school_id)
      )
    )
  );

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

-- 5. Enhanced get_school_period_config function with grade prioritization
CREATE OR REPLACE FUNCTION get_school_period_config(p_school_id UUID, p_grade INTEGER DEFAULT NULL)
RETURNS TABLE (
  day_of_week INTEGER,
  day_name TEXT,
  periods JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  grade_group TEXT;
BEGIN
  -- Determine grade group if grade is provided
  IF p_grade IS NOT NULL THEN
    grade_group := CASE 
      WHEN p_grade BETWEEN 1 AND 5 THEN '1-5'
      WHEN p_grade BETWEEN 6 AND 10 THEN '6-10'
      WHEN p_grade BETWEEN 11 AND 12 THEN '11-12'
      ELSE 'all'
    END;
  END IF;

  RETURN QUERY
  WITH prioritized_settings AS (
    SELECT 
      sps.*,
      CASE 
        WHEN sps.grade_group = p_grade::text THEN 1  -- Exact grade match (highest priority)
        WHEN sps.grade_group = grade_group THEN 2    -- Grade group match
        WHEN sps.grade_group = 'all' THEN 3          -- Default fallback
        ELSE 4
      END as priority
    FROM public.school_period_settings sps
    WHERE sps.school_id = p_school_id 
      AND sps.is_active = TRUE
      AND (
        sps.grade_group = p_grade::text OR
        sps.grade_group = grade_group OR 
        sps.grade_group = 'all'
      )
  ),
  best_settings AS (
    SELECT DISTINCT ON (day_of_week, period_number) *
    FROM prioritized_settings
    ORDER BY day_of_week, period_number, priority
  )
  SELECT 
    bs.day_of_week,
    CASE bs.day_of_week 
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
        'period_number', bs.period_number,
        'period_name', COALESCE(bs.period_name, 'Period ' || bs.period_number),
        'start_time', bs.start_time::text,
        'end_time', bs.end_time::text,
        'is_break', bs.is_break,
        'duration_minutes', EXTRACT(EPOCH FROM (bs.end_time - bs.start_time))/60
      ) ORDER BY bs.period_number
    ) as periods
  FROM best_settings bs
  GROUP BY bs.day_of_week
  ORDER BY bs.day_of_week;
END;
$$;

-- 6. Function to get available teachers for a subject and grade
CREATE OR REPLACE FUNCTION get_available_teachers(
  p_school_id UUID,
  p_subject TEXT,
  p_grade INTEGER,
  p_weekday INTEGER,
  p_period_no INTEGER,
  p_exclude_section_id UUID DEFAULT NULL
)
RETURNS TABLE (
  teacher_id UUID,
  teacher_name TEXT,
  proficiency_level TEXT,
  current_load INTEGER,
  max_load INTEGER,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as teacher_id,
    u.first_name || ' ' || u.last_name as teacher_name,
    COALESCE(ts.proficiency_level, 'competent') as proficiency_level,
    COALESCE(current_periods.period_count, 0) as current_load,
    COALESCE(tls.max_periods_per_week, 30) as max_load,
    (
      -- Check if teacher is not already assigned at this time
      NOT EXISTS (
        SELECT 1 FROM public.periods p2
        JOIN public.sections s2 ON p2.section_id = s2.id
        WHERE p2.teacher_id = u.id
          AND p2.weekday = p_weekday
          AND p2.period_no = p_period_no
          AND s2.school_id = p_school_id
          AND (p_exclude_section_id IS NULL OR s2.id != p_exclude_section_id)
      )
      -- Check if teacher hasn't exceeded daily limit
      AND COALESCE(daily_periods.daily_count, 0) < COALESCE(tls.max_periods_per_day, 6)
      -- Check if teacher hasn't exceeded weekly limit
      AND COALESCE(current_periods.period_count, 0) < COALESCE(tls.max_periods_per_week, 30)
    ) as is_available
  FROM public.users u
  LEFT JOIN public.teacher_subjects ts ON ts.teacher_id = u.id 
    AND ts.school_id = p_school_id 
    AND ts.subject = p_subject
    AND (ts.grades IS NULL OR p_grade = ANY(ts.grades))
  LEFT JOIN public.teacher_load_settings tls ON tls.teacher_id = u.id 
    AND tls.school_id = p_school_id
  LEFT JOIN (
    SELECT 
      p.teacher_id,
      COUNT(*) as period_count
    FROM public.periods p
    JOIN public.sections s ON p.section_id = s.id
    WHERE s.school_id = p_school_id
    GROUP BY p.teacher_id
  ) current_periods ON current_periods.teacher_id = u.id
  LEFT JOIN (
    SELECT 
      p.teacher_id,
      COUNT(*) as daily_count
    FROM public.periods p
    JOIN public.sections s ON p.section_id = s.id
    WHERE s.school_id = p_school_id
      AND p.weekday = p_weekday
    GROUP BY p.teacher_id
  ) daily_periods ON daily_periods.teacher_id = u.id
  WHERE u.school_id = p_school_id 
    AND u.role = 'teacher'
    AND (ts.teacher_id IS NOT NULL OR p_subject = 'Physical Education') -- Allow PE for all teachers
  ORDER BY 
    ts.is_preferred DESC NULLS LAST,
    ts.proficiency_level DESC NULLS LAST,
    current_load ASC;
END;
$$;

-- 7. Function to auto-fill timetable for a section
CREATE OR REPLACE FUNCTION autofill_timetable(
  p_section_id UUID,
  p_replace_existing BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  periods_filled INTEGER,
  total_periods INTEGER,
  unassigned_subjects TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  section_record RECORD;
  subject_req RECORD;
  period_config RECORD;
  available_periods INTEGER[];
  periods_per_subject INTEGER;
  assigned_count INTEGER := 0;
  total_count INTEGER := 0;
  unassigned TEXT[] := '{}';
  teacher_record RECORD;
  period_slot RECORD;
  start_time TIMESTAMP;
BEGIN
  start_time := NOW();
  
  -- Get section details
  SELECT s.*, sch.id as school_id 
  INTO section_record
  FROM public.sections s
  JOIN public.schools sch ON s.school_id = sch.id
  WHERE s.id = p_section_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Section not found', 0, 0, ARRAY[]::TEXT[];
    RETURN;
  END IF;
  
  -- Clear existing periods if requested
  IF p_replace_existing THEN
    DELETE FROM public.periods WHERE section_id = p_section_id;
  END IF;
  
  -- Get available periods (non-break periods)
  SELECT array_agg(period_number::integer ORDER BY period_number::integer) 
  INTO available_periods
  FROM (
    SELECT DISTINCT jsonb_array_elements(periods)->>'period_number' as period_number
    FROM get_school_period_config(section_record.school_id, section_record.grade)
    WHERE NOT (jsonb_array_elements(periods)->>'is_break')::boolean
  ) non_break_periods;
  
  -- Handle case where no periods are configured
  IF available_periods IS NULL OR array_length(available_periods, 1) IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No periods configured for this grade', 0, 0, ARRAY['No period configuration found']::TEXT[];
    RETURN;
  END IF;
  
  total_count := array_length(available_periods, 1) * 6; -- 6 days per week
  
  -- Process each subject requirement
  FOR subject_req IN 
    SELECT subject, periods_per_week 
    FROM public.subject_requirements 
    WHERE school_id = section_record.school_id 
      AND grade = section_record.grade
      AND is_mandatory = TRUE
    ORDER BY periods_per_week DESC -- Assign subjects with more periods first
  LOOP
    periods_per_subject := 0;
    
    -- Try to assign the required periods for this subject
    FOR period_slot IN
      SELECT day_of_week, period_number
      FROM (
        SELECT d.day_of_week, p.period_number,
               ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
        FROM generate_series(0, 5) d(day_of_week)
        CROSS JOIN unnest(available_periods) AS p(period_number)
        WHERE NOT EXISTS (
          SELECT 1 FROM public.periods existing
          WHERE existing.section_id = p_section_id
            AND existing.weekday = d.day_of_week
            AND existing.period_no = p.period_number
        )
      ) available_slots
      WHERE periods_per_subject < subject_req.periods_per_week
      ORDER BY rn
    LOOP
      -- Find an available teacher for this subject, grade, and time slot
      SELECT teacher_id, teacher_name
      INTO teacher_record
      FROM get_available_teachers(
        section_record.school_id,
        subject_req.subject,
        section_record.grade,
        period_slot.day_of_week,
        period_slot.period_number,
        p_section_id
      )
      WHERE is_available = TRUE
      ORDER BY proficiency_level DESC, current_load ASC
      LIMIT 1;
      
      IF FOUND THEN
        -- Insert the period
        INSERT INTO public.periods (
          section_id, weekday, period_no, subject, teacher_id
        ) VALUES (
          p_section_id, 
          period_slot.day_of_week, 
          period_slot.period_number, 
          subject_req.subject, 
          teacher_record.teacher_id
        );
        
        periods_per_subject := periods_per_subject + 1;
        assigned_count := assigned_count + 1;
      END IF;
      
      EXIT WHEN periods_per_subject >= subject_req.periods_per_week;
    END LOOP;
    
    -- Track unassigned subjects
    IF periods_per_subject < subject_req.periods_per_week THEN
      unassigned := array_append(unassigned, subject_req.subject || ' (' || 
        (subject_req.periods_per_week - periods_per_subject) || ' periods missing)');
    END IF;
  END LOOP;
  
  -- Log the autofill attempt
  INSERT INTO public.timetable_autofill_logs (
    school_id, section_id, success_rate, unassigned_subjects, 
    generation_time_ms, generated_by
  ) VALUES (
    section_record.school_id,
    p_section_id,
    CASE WHEN total_count > 0 THEN (assigned_count::NUMERIC / total_count::NUMERIC) * 100 ELSE 0 END,
    unassigned,
    EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
    auth.uid()
  );
  
  RETURN QUERY SELECT 
    TRUE,
    'Timetable generation completed',
    assigned_count,
    total_count,
    unassigned;
END;
$$;

-- 8. Function to copy timetable between sections
CREATE OR REPLACE FUNCTION copy_timetable(
  p_from_section_id UUID,
  p_to_section_id UUID,
  p_copy_teachers BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  periods_copied INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  from_section RECORD;
  to_section RECORD;
  copied_count INTEGER := 0;
BEGIN
  -- Validate sections exist and are from the same school
  SELECT s.*, sch.id as school_id INTO from_section
  FROM public.sections s
  JOIN public.schools sch ON s.school_id = sch.id
  WHERE s.id = p_from_section_id;
  
  SELECT s.*, sch.id as school_id INTO to_section
  FROM public.sections s  
  JOIN public.schools sch ON s.school_id = sch.id
  WHERE s.id = p_to_section_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'One or both sections not found', 0;
    RETURN;
  END IF;
  
  IF from_section.school_id != to_section.school_id THEN
    RETURN QUERY SELECT FALSE, 'Sections must be from the same school', 0;
    RETURN;
  END IF;
  
  -- Clear existing periods in target section
  DELETE FROM public.periods WHERE section_id = p_to_section_id;
  
  -- Copy periods
  INSERT INTO public.periods (
    section_id, weekday, period_no, subject, teacher_id, start_time, end_time
  )
  SELECT 
    p_to_section_id,
    weekday,
    period_no,
    subject,
    CASE WHEN p_copy_teachers THEN teacher_id ELSE NULL END,
    start_time,
    end_time
  FROM public.periods
  WHERE section_id = p_from_section_id;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    TRUE,
    'Timetable copied successfully',
    copied_count;
END;
$$;

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

-- Update triggers - only create if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_timetable_templates_updated_at') THEN
        CREATE TRIGGER update_timetable_templates_updated_at 
        BEFORE UPDATE ON public.timetable_templates 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 