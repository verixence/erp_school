-- Migration: Fix attendance functions
-- Purpose: Fix attendance functions to handle both daily and period-wise attendance correctly

-- Fix attendance function to handle both modes correctly
CREATE OR REPLACE FUNCTION get_enhanced_attendance_stats(
  start_date DATE,
  end_date DATE,
  school_id_param UUID,
  grade_filter TEXT DEFAULT NULL,
  section_filter TEXT DEFAULT NULL,
  is_period_mode BOOLEAN DEFAULT false
)
RETURNS TABLE (
  total_students INTEGER,
  total_records INTEGER,
  present_count INTEGER,
  absent_count INTEGER,
  late_count INTEGER,
  excused_count INTEGER,
  attendance_rate DECIMAL,
  daily_averages JSON,
  by_grade JSON
) AS $$
DECLARE
  student_count INTEGER;
BEGIN
  -- Get total number of students
  SELECT COUNT(*) INTO student_count
  FROM students s
  WHERE s.school_id = school_id_param
    AND (grade_filter IS NULL OR s.grade = grade_filter)
    AND (section_filter IS NULL OR s.section = section_filter);

  RETURN QUERY
  WITH base_attendance AS (
    SELECT 
      s.id as student_id,
      s.grade,
      CASE 
        WHEN NOT is_period_mode THEN
          -- For daily attendance
          (SELECT status 
           FROM attendance_records ar 
           WHERE ar.student_id = s.id 
             AND ar.date = d.date 
             AND ar.school_id = school_id_param
             AND ar.period_number IS NULL
           LIMIT 1)
        ELSE
          -- For period attendance
          (SELECT 
            CASE
              WHEN COUNT(*) = 0 THEN NULL
              WHEN COUNT(*) FILTER (WHERE status = 'present') > COUNT(*) / 2 THEN 'present'
              WHEN COUNT(*) FILTER (WHERE status = 'absent') > COUNT(*) / 2 THEN 'absent'
              WHEN COUNT(*) FILTER (WHERE status = 'late') > 0 THEN 'late'
              ELSE 'excused'
            END
           FROM period_attendance pa
           WHERE pa.student_id = s.id 
             AND pa.date = d.date 
             AND pa.school_id = school_id_param)
      END as status,
      d.date
    FROM students s
    CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) d(date)
    WHERE s.school_id = school_id_param
      AND (grade_filter IS NULL OR s.grade = grade_filter)
      AND (section_filter IS NULL OR s.section = section_filter)
  ),
  attendance_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status IS NOT NULL) as total_records,
      COUNT(*) FILTER (WHERE status = 'present') as present_count,
      COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
      COUNT(*) FILTER (WHERE status = 'late') as late_count,
      COUNT(*) FILTER (WHERE status = 'excused') as excused_count,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status IS NOT NULL) > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status IS NOT NULL), 0)) * 100,
            2
          )
        ELSE 0
      END as attendance_rate
    FROM base_attendance
  ),
  daily_stats AS (
    SELECT
      date,
      COUNT(*) FILTER (WHERE status IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status IS NOT NULL) > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status IS NOT NULL), 0)) * 100,
            2
          )
        ELSE 0
      END as rate
    FROM base_attendance
    GROUP BY date
    ORDER BY date
  ),
  grade_stats AS (
    SELECT
      grade,
      COUNT(*) FILTER (WHERE status IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status IS NOT NULL) > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status IS NOT NULL), 0)) * 100,
            2
          )
        ELSE 0
      END as rate
    FROM base_attendance
    GROUP BY grade
    ORDER BY grade
  )
  SELECT
    student_count::INTEGER as total_students,
    COALESCE(total_records, 0)::INTEGER as total_records,
    COALESCE(present_count, 0)::INTEGER as present_count,
    COALESCE(absent_count, 0)::INTEGER as absent_count,
    COALESCE(late_count, 0)::INTEGER as late_count,
    COALESCE(excused_count, 0)::INTEGER as excused_count,
    COALESCE(attendance_rate, 0)::DECIMAL as attendance_rate,
    COALESCE(
      (SELECT json_agg(row_to_json(d))
       FROM daily_stats d),
      '[]'::json
    ) as daily_averages,
    COALESCE(
      (SELECT json_agg(row_to_json(g))
       FROM grade_stats g),
      '[]'::json
    ) as by_grade
  FROM attendance_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_enhanced_attendance_stats(DATE, DATE, UUID, TEXT, TEXT, BOOLEAN) TO authenticated; 