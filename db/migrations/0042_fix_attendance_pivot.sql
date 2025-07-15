-- Migration: Fix attendance pivot function
-- Purpose: Fix the attendance pivot function to properly handle both daily and period modes

-- Drop existing functions to avoid version conflicts
DROP FUNCTION IF EXISTS attendance_pivot(DATE, DATE, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_enhanced_attendance_stats(DATE, DATE, UUID, TEXT, TEXT, BOOLEAN);

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
  IF is_period_mode THEN
    -- Return period-wise attendance data
    RETURN QUERY
    WITH student_attendance AS (
      SELECT
        s.id as student_id,
        s.full_name as student_name,
        s.admission_no,
        s.grade,
        s.section,
        dates.date,
        jsonb_build_object(
          'periods',
          COALESCE(
            jsonb_object_agg(
              pa.period_no::text,
              jsonb_build_object(
                'status', pa.status,
                'recorded_by', u.first_name || ' ' || u.last_name,
                'notes', pa.notes
              )
            ) FILTER (WHERE pa.period_no IS NOT NULL),
            '{}'::jsonb
          )
        ) as daily_data
      FROM students s
      CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) AS dates(date)
      LEFT JOIN period_attendance pa ON s.id = pa.student_id
        AND pa.date = dates.date
        AND pa.school_id = school_id_param
      LEFT JOIN users u ON pa.recorded_by = u.id
      WHERE s.school_id = school_id_param
      GROUP BY s.id, s.full_name, s.admission_no, s.grade, s.section, dates.date
    )
    SELECT
      sa.student_id,
      sa.student_name,
      sa.admission_no,
      sa.grade,
      sa.section,
      jsonb_object_agg(
        sa.date::text,
        CASE 
          WHEN sa.daily_data->'periods' = '{}'::jsonb THEN 
            jsonb_build_object(
              'status', 'no_record',
              'recorded_by', NULL,
              'notes', NULL
            )
          ELSE sa.daily_data
        END
      ) as attendance_data
    FROM student_attendance sa
    GROUP BY
      sa.student_id,
      sa.student_name,
      sa.admission_no,
      sa.grade,
      sa.section
    ORDER BY sa.grade, sa.section, sa.student_name;
  ELSE
    -- Return daily attendance data
    RETURN QUERY
    WITH student_attendance AS (
      SELECT
        s.id as student_id,
        s.full_name as student_name,
        s.admission_no,
        s.grade,
        s.section,
        dates.date,
        COALESCE(
          jsonb_build_object(
            'status', COALESCE(ar.status, 'no_record'),
            'recorded_by', 
            CASE 
              WHEN ar.recorded_by IS NOT NULL THEN u.first_name || ' ' || u.last_name 
              ELSE NULL 
            END,
            'notes', ar.notes
          ),
          jsonb_build_object(
            'status', 'no_record',
            'recorded_by', NULL,
            'notes', NULL
          )
        ) as daily_data
      FROM students s
      CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) AS dates(date)
      LEFT JOIN attendance_records ar ON s.id = ar.student_id
        AND ar.date = dates.date
        AND ar.school_id = school_id_param
        AND ar.period_number IS NULL
      LEFT JOIN users u ON ar.recorded_by = u.id
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
  END IF;
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
  WITH base_records AS (
    SELECT 
      s.id as student_id,
      s.grade,
      dates.date,
      CASE 
        WHEN is_period_mode THEN
          -- For period attendance, aggregate status across periods
          COALESCE(
            (SELECT 
              CASE
                WHEN COUNT(*) = 0 THEN 'no_record'
                WHEN COUNT(*) FILTER (WHERE status = 'present') > COUNT(*) / 2 THEN 'present'
                WHEN COUNT(*) FILTER (WHERE status = 'absent') > COUNT(*) / 2 THEN 'absent'
                WHEN COUNT(*) FILTER (WHERE status = 'late') > 0 THEN 'late'
                ELSE 'excused'
              END
            FROM period_attendance pa
            WHERE pa.student_id = s.id 
              AND pa.date = dates.date 
              AND pa.school_id = school_id_param),
            'no_record'
          )
        ELSE
          -- For daily attendance
          COALESCE(
            (SELECT status 
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
  attendance_stats AS (
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
             NULLIF(COUNT(*) FILTER (WHERE status != 'no_record'), 0)) * 100,
            2
          )
        ELSE 0
      END as attendance_rate
    FROM base_records
  ),
  daily_stats AS (
    SELECT
      date,
      COUNT(*) FILTER (WHERE status != 'no_record') as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status != 'no_record') > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status != 'no_record'), 0)) * 100,
            2
          )
        ELSE 0
      END as rate
    FROM base_records
    GROUP BY date
    ORDER BY date
  ),
  grade_stats AS (
    SELECT
      grade,
      COUNT(*) FILTER (WHERE status != 'no_record') as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      CASE 
        WHEN COUNT(*) FILTER (WHERE status != 'no_record') > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status != 'no_record'), 0)) * 100,
            2
          )
        ELSE 0
      END as rate
    FROM base_records
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
GRANT EXECUTE ON FUNCTION attendance_pivot(DATE, DATE, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_attendance_stats(DATE, DATE, UUID, TEXT, TEXT, BOOLEAN) TO authenticated; 