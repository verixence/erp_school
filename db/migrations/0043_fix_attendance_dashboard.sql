-- Migration: Fix attendance dashboard functions
-- Purpose: Create proper attendance functions that work with the current database structure

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS attendance_pivot(DATE, DATE, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_enhanced_attendance_stats(DATE, DATE, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS get_student_attendance_percentage(UUID, DATE, DATE);

-- Create fixed attendance pivot function
CREATE OR REPLACE FUNCTION attendance_pivot(
  start_date DATE,
  end_date DATE,
  school_id_param UUID,
  is_period_mode BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  admission_no TEXT,
  grade TEXT,
  section TEXT,
  attendance_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH student_attendance AS (
    SELECT
      s.id as student_id,
      s.full_name as student_name,
      s.admission_no,
      s.grade,
      s.section,
      dates.date,
      CASE
        WHEN is_period_mode THEN
          -- For period mode, aggregate all periods for that day
          COALESCE(
            (SELECT jsonb_build_object(
              'status', 
              CASE 
                WHEN COUNT(*) = 0 THEN 'no_record'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'present') >= COUNT(*) / 2 THEN 'present'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'absent') >= COUNT(*) / 2 THEN 'absent'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'late') > 0 THEN 'late'
                ELSE 'excused'
              END,
              'periods', jsonb_object_agg(
                ar.period_number::text, 
                jsonb_build_object(
                  'status', ar.status,
                  'subject', ar.subject,
                  'notes', ar.notes
                )
              ),
              'recorded_by', MAX(u.first_name || ' ' || u.last_name)
            )
            FROM attendance_records ar
            LEFT JOIN users u ON ar.recorded_by = u.id
            WHERE ar.student_id = s.id 
              AND ar.date = dates.date 
              AND ar.school_id = school_id_param
              AND ar.period_number IS NOT NULL
            ),
            jsonb_build_object('status', 'no_record')
          )
        ELSE
          -- For daily mode, get single daily record
          COALESCE(
            (SELECT jsonb_build_object(
              'status', ar.status,
              'recorded_by', u.first_name || ' ' || u.last_name,
              'notes', ar.notes
            )
            FROM attendance_records ar
            LEFT JOIN users u ON ar.recorded_by = u.id
            WHERE ar.student_id = s.id 
              AND ar.date = dates.date 
              AND ar.school_id = school_id_param
              AND ar.period_number IS NULL
            LIMIT 1),
            jsonb_build_object('status', 'no_record')
          )
      END as daily_data
    FROM students s
    CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) AS dates(date)
    WHERE s.school_id = school_id_param
  )
  SELECT
    sa.student_id,
    sa.student_name,
    sa.admission_no,
    sa.grade,
    sa.section,
    jsonb_object_agg(
      sa.date::text,
      sa.daily_data
    ) as attendance_data
  FROM student_attendance sa
  GROUP BY
    sa.student_id,
    sa.student_name,
    sa.admission_no,
    sa.grade,
    sa.section
  ORDER BY sa.grade, sa.section, sa.student_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create fixed enhanced attendance stats function
CREATE OR REPLACE FUNCTION get_enhanced_attendance_stats(
  start_date DATE,
  end_date DATE,
  school_id_param UUID,
  grade_filter TEXT DEFAULT NULL,
  section_filter TEXT DEFAULT NULL,
  is_period_mode BOOLEAN DEFAULT FALSE
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
BEGIN
  RETURN QUERY
  WITH student_daily_attendance AS (
    SELECT 
      s.id as student_id,
      s.grade,
      dates.date,
      CASE 
        WHEN is_period_mode THEN
          -- For period mode, aggregate periods for each day
          COALESCE(
            (SELECT 
              CASE
                WHEN COUNT(*) = 0 THEN 'no_record'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'present') >= COUNT(*) / 2 THEN 'present'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'absent') >= COUNT(*) / 2 THEN 'absent'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'late') > 0 THEN 'late'
                ELSE 'excused'
              END
            FROM attendance_records ar
            WHERE ar.student_id = s.id 
              AND ar.date = dates.date 
              AND ar.school_id = school_id_param
              AND ar.period_number IS NOT NULL),
            'no_record'
          )
        ELSE
          -- For daily mode, get single daily record
          COALESCE(
            (SELECT ar.status 
            FROM attendance_records ar 
            WHERE ar.student_id = s.id 
              AND ar.date = dates.date 
              AND ar.school_id = school_id_param
              AND ar.period_number IS NULL
            LIMIT 1),
            'no_record'
          )
      END as status
    FROM students s
    CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) AS dates(date)
    WHERE s.school_id = school_id_param
      AND (grade_filter IS NULL OR s.grade = grade_filter)
      AND (section_filter IS NULL OR s.section = section_filter)
  ),
  
  attendance_summary AS (
    SELECT
      COUNT(*) FILTER (WHERE status != 'no_record') as total_records,
      COUNT(*) FILTER (WHERE status = 'present') as present_count,
      COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
      COUNT(*) FILTER (WHERE status = 'late') as late_count,
      COUNT(*) FILTER (WHERE status = 'excused') as excused_count,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status != 'no_record') > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             COUNT(*) FILTER (WHERE status != 'no_record')) * 100,
            2
          )
        ELSE 0
      END as attendance_rate
    FROM student_daily_attendance
  ),
  
  daily_summary AS (
    SELECT
      date,
      COUNT(*) FILTER (WHERE status != 'no_record') as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status != 'no_record') > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             COUNT(*) FILTER (WHERE status != 'no_record')) * 100,
            2
          )
        ELSE 0
      END as rate
    FROM student_daily_attendance
    GROUP BY date
    ORDER BY date
  ),
  
  grade_summary AS (
    SELECT
      grade,
      COUNT(*) FILTER (WHERE status != 'no_record') as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status != 'no_record') > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             COUNT(*) FILTER (WHERE status != 'no_record')) * 100,
            2
          )
        ELSE 0
      END as rate
    FROM student_daily_attendance
    GROUP BY grade
    ORDER BY grade
  ),
  
  total_students_count AS (
    SELECT COUNT(*) as count
    FROM students s
    WHERE s.school_id = school_id_param
      AND (grade_filter IS NULL OR s.grade = grade_filter)
      AND (section_filter IS NULL OR s.section = section_filter)
  )
  
  SELECT
    total_students_count.count::INTEGER as total_students,
    COALESCE(attendance_summary.total_records, 0)::INTEGER as total_records,
    COALESCE(attendance_summary.present_count, 0)::INTEGER as present_count,
    COALESCE(attendance_summary.absent_count, 0)::INTEGER as absent_count,
    COALESCE(attendance_summary.late_count, 0)::INTEGER as late_count,
    COALESCE(attendance_summary.excused_count, 0)::INTEGER as excused_count,
    COALESCE(attendance_summary.attendance_rate, 0)::DECIMAL as attendance_rate,
    COALESCE(
      (SELECT json_agg(row_to_json(d))
       FROM daily_summary d),
      '[]'::json
    ) as daily_averages,
    COALESCE(
      (SELECT json_agg(row_to_json(g))
       FROM grade_summary g),
      '[]'::json
    ) as by_grade
  FROM total_students_count
  CROSS JOIN attendance_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create student attendance percentage function for parents
CREATE OR REPLACE FUNCTION get_student_attendance_percentage(
  student_id_param UUID,
  date_from DATE,
  date_to DATE
)
RETURNS TABLE (
  total_days INTEGER,
  present_days INTEGER,
  absent_days INTEGER,
  late_days INTEGER,
  excused_days INTEGER,
  attendance_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH student_attendance AS (
    SELECT 
      dates.date,
      COALESCE(
        (SELECT 
          CASE
            -- If we have period data, aggregate it
            WHEN COUNT(*) FILTER (WHERE ar.period_number IS NOT NULL) > 0 THEN
              CASE
                WHEN COUNT(*) FILTER (WHERE ar.status = 'present') >= COUNT(*) / 2 THEN 'present'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'absent') >= COUNT(*) / 2 THEN 'absent'
                WHEN COUNT(*) FILTER (WHERE ar.status = 'late') > 0 THEN 'late'
                ELSE 'excused'
              END
            -- If we have daily data, use it directly
            ELSE MAX(ar.status)
          END
        FROM attendance_records ar
        WHERE ar.student_id = student_id_param 
          AND ar.date = dates.date),
        'no_record'
      ) as status
    FROM generate_series(date_from, date_to, '1 day'::interval) AS dates(date)
  )
  SELECT
    COUNT(*)::INTEGER as total_days,
    COUNT(*) FILTER (WHERE status = 'present')::INTEGER as present_days,
    COUNT(*) FILTER (WHERE status = 'absent')::INTEGER as absent_days,
    COUNT(*) FILTER (WHERE status = 'late')::INTEGER as late_days,
    COUNT(*) FILTER (WHERE status = 'excused')::INTEGER as excused_days,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status != 'no_record') > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
           COUNT(*) FILTER (WHERE status != 'no_record')) * 100,
          2
        )
      ELSE 0
    END as attendance_percentage
  FROM student_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION attendance_pivot(DATE, DATE, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_attendance_stats(DATE, DATE, UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_attendance_percentage(UUID, DATE, DATE) TO authenticated; 