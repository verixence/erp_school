-- Migration: Enhanced Attendance System
-- Purpose: Add period-wise attendance, notifications, and enhanced tracking

-- ============================================
-- PERIOD-WISE ATTENDANCE ENHANCEMENTS
-- ============================================

-- Add period information to attendance_records for per-period mode
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES public.periods(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS period_number integer,
ADD COLUMN IF NOT EXISTS subject text;

-- Create index for period-wise queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_period 
ON public.attendance_records(school_id, date, period_number, subject);

-- Create unique constraint for period-wise attendance to prevent duplicates
-- This will replace the existing daily constraint when in per-period mode
CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_period_unique_idx 
ON public.attendance_records(student_id, date, period_number, subject)
WHERE period_number IS NOT NULL;

-- ============================================
-- ATTENDANCE NOTIFICATIONS
-- ============================================

-- Create attendance_notifications table for parent alerts
CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  attendance_record_id uuid REFERENCES public.attendance_records(id) ON DELETE CASCADE NOT NULL,
  notification_type text CHECK (notification_type IN ('absent', 'late', 'excused')) NOT NULL,
  message text NOT NULL,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_attendance_notifications_parent 
ON public.attendance_notifications(parent_id, is_sent, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_notifications_school_date 
ON public.attendance_notifications(school_id, created_at DESC);

-- Enable RLS for attendance notifications
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy for notifications
CREATE POLICY "Attendance notifications: school access" ON public.attendance_notifications
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- ============================================
-- ATTENDANCE SETTINGS PER SCHOOL
-- ============================================

-- Create attendance_settings table for school-specific configurations
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  attendance_mode text CHECK (attendance_mode IN ('daily', 'per_period')) DEFAULT 'daily',
  notify_parents boolean DEFAULT true,
  notification_delay_minutes integer DEFAULT 30, -- Delay before sending notification
  auto_mark_present boolean DEFAULT false, -- Auto-mark as present if not marked
  grace_period_minutes integer DEFAULT 15, -- Grace period for late marking
  weekend_attendance boolean DEFAULT false, -- Whether to track weekend attendance
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for attendance settings
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for attendance settings
CREATE POLICY "Attendance settings: school access" ON public.attendance_settings
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- ============================================
-- ENHANCED FUNCTIONS
-- ============================================

-- Function to get attendance statistics with period support
CREATE OR REPLACE FUNCTION public.get_enhanced_attendance_stats(
  start_date date,
  end_date date,
  school_id_param uuid,
  grade_filter text DEFAULT NULL,
  section_filter text DEFAULT NULL
)
RETURNS TABLE (
  total_students bigint,
  total_records bigint,
  present_count bigint,
  absent_count bigint,
  late_count bigint,
  excused_count bigint,
  attendance_rate numeric,
  daily_averages jsonb,
  by_grade jsonb
)
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_students AS (
    SELECT s.id, s.grade, s.section
    FROM public.students s
    WHERE s.school_id = school_id_param
      AND (grade_filter IS NULL OR s.grade = grade_filter)
      AND (section_filter IS NULL OR s.section = section_filter)
  ),
  attendance_summary AS (
    SELECT 
      COUNT(*) as total_records,
      COUNT(*) FILTER (WHERE ar.status = 'present') as present_count,
      COUNT(*) FILTER (WHERE ar.status = 'absent') as absent_count,
      COUNT(*) FILTER (WHERE ar.status = 'late') as late_count,
      COUNT(*) FILTER (WHERE ar.status = 'excused') as excused_count
    FROM public.attendance_records ar
    INNER JOIN filtered_students fs ON ar.student_id = fs.id
    WHERE ar.school_id = school_id_param
      AND ar.date BETWEEN start_date AND end_date
  ),
  daily_stats AS (
    SELECT 
      ar.date,
      COUNT(*) as day_total,
      COUNT(*) FILTER (WHERE ar.status = 'present') as day_present,
      ROUND(
        (COUNT(*) FILTER (WHERE ar.status = 'present')::numeric / 
         NULLIF(COUNT(*), 0)::numeric) * 100, 2
      ) as day_rate
    FROM public.attendance_records ar
    INNER JOIN filtered_students fs ON ar.student_id = fs.id
    WHERE ar.school_id = school_id_param
      AND ar.date BETWEEN start_date AND end_date
    GROUP BY ar.date
    ORDER BY ar.date
  ),
  grade_stats AS (
    SELECT 
      fs.grade,
      COUNT(*) as grade_total,
      COUNT(*) FILTER (WHERE ar.status = 'present') as grade_present,
      ROUND(
        (COUNT(*) FILTER (WHERE ar.status = 'present')::numeric / 
         NULLIF(COUNT(*), 0)::numeric) * 100, 2
      ) as grade_rate
    FROM public.attendance_records ar
    INNER JOIN filtered_students fs ON ar.student_id = fs.id
    WHERE ar.school_id = school_id_param
      AND ar.date BETWEEN start_date AND end_date
    GROUP BY fs.grade
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered_students)::bigint,
    COALESCE(ats.total_records, 0)::bigint,
    COALESCE(ats.present_count, 0)::bigint,
    COALESCE(ats.absent_count, 0)::bigint,
    COALESCE(ats.late_count, 0)::bigint,
    COALESCE(ats.excused_count, 0)::bigint,
    CASE 
      WHEN COALESCE(ats.total_records, 0) > 0 THEN
        ROUND(
          ((COALESCE(ats.present_count, 0) + COALESCE(ats.late_count, 0))::numeric / 
           COALESCE(ats.total_records, 1)::numeric) * 100, 2
        )
      ELSE 0
    END as attendance_rate,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'date', date,
        'total', day_total,
        'present', day_present,
        'rate', day_rate
      )) FROM daily_stats),
      '[]'::jsonb
    ) as daily_averages,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'grade', grade,
        'total', grade_total,
        'present', grade_present,
        'rate', grade_rate
      )) FROM grade_stats),
      '[]'::jsonb
    ) as by_grade
  FROM attendance_summary ats;
END;
$$;

-- Function to create attendance notifications
CREATE OR REPLACE FUNCTION public.create_attendance_notification(
  attendance_record_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  rec record;
  parent_rec record;
  notification_msg text;
BEGIN
  -- Get attendance record details
  SELECT 
    ar.*, 
    s.full_name as student_name,
    s.grade,
    s.section,
    ar.school_id
  INTO rec
  FROM public.attendance_records ar
  INNER JOIN public.students s ON ar.student_id = s.id
  WHERE ar.id = attendance_record_id_param;
  
  -- Only create notifications for non-present statuses
  IF rec.status IN ('absent', 'late', 'excused') THEN
    -- Generate notification message
    notification_msg := CASE 
      WHEN rec.status = 'absent' THEN 
        format('%s was marked absent on %s for Grade %s-%s', 
               rec.student_name, rec.date, rec.grade, rec.section)
      WHEN rec.status = 'late' THEN 
        format('%s was marked late on %s for Grade %s-%s', 
               rec.student_name, rec.date, rec.grade, rec.section)
      WHEN rec.status = 'excused' THEN 
        format('%s was marked excused on %s for Grade %s-%s', 
               rec.student_name, rec.date, rec.grade, rec.section)
    END;
    
    -- Create notifications for all parents of the student
    FOR parent_rec IN 
      SELECT DISTINCT u.id as parent_id
      FROM public.users u
      INNER JOIN public.student_parents sp ON u.id = sp.parent_id
      WHERE sp.student_id = rec.student_id
        AND u.role = 'parent'
        AND u.school_id = rec.school_id
    LOOP
      INSERT INTO public.attendance_notifications (
        school_id,
        student_id,
        parent_id,
        attendance_record_id,
        notification_type,
        message
      ) VALUES (
        rec.school_id,
        rec.student_id,
        parent_rec.parent_id,
        attendance_record_id_param,
        rec.status,
        notification_msg
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicates
    END LOOP;
  END IF;
END;
$$;

-- Function to get student attendance percentage
CREATE OR REPLACE FUNCTION public.get_student_attendance_percentage(
  student_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  total_days bigint,
  present_days bigint,
  absent_days bigint,
  late_days bigint,
  excused_days bigint,
  attendance_percentage numeric
)
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_days,
    COUNT(*) FILTER (WHERE status = 'present') as present_days,
    COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
    COUNT(*) FILTER (WHERE status = 'late') as late_days,
    COUNT(*) FILTER (WHERE status = 'excused') as excused_days,
    CASE 
      WHEN COUNT(*) > 0 THEN
        ROUND(
          ((COUNT(*) FILTER (WHERE status IN ('present', 'late')))::numeric / 
           COUNT(*)::numeric) * 100, 2
        )
      ELSE 0
    END as attendance_percentage
  FROM public.attendance_records
  WHERE student_id = student_id_param
    AND date BETWEEN start_date AND end_date;
END;
$$;

-- ============================================
-- TRIGGERS FOR NOTIFICATIONS
-- ============================================

-- Trigger function to create notifications when attendance is marked
CREATE OR REPLACE FUNCTION public.trigger_attendance_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create notifications for INSERT (new records) and UPDATE (status changes)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    -- Create notification asynchronously
    PERFORM public.create_attendance_notification(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on attendance_records
DROP TRIGGER IF EXISTS attendance_notification_trigger ON public.attendance_records;
CREATE TRIGGER attendance_notification_trigger
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_attendance_notification();

-- ============================================
-- SAMPLE DATA FOR ATTENDANCE SETTINGS
-- ============================================

-- Insert default attendance settings for existing schools
INSERT INTO public.attendance_settings (school_id, attendance_mode, notify_parents)
SELECT id, COALESCE(attendance_mode, 'daily'), true
FROM public.schools
ON CONFLICT (school_id) DO NOTHING; 