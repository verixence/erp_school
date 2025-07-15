-- Create period attendance table
CREATE TABLE IF NOT EXISTS period_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period_no INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  recorded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, student_id, date, period_no)
);

-- Add RLS policies for period attendance
ALTER TABLE period_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users in the same school" ON period_attendance
  FOR SELECT
  USING (school_id = auth.jwt() ->> 'school_id'::text);

CREATE POLICY "Enable insert access for teachers and admins" ON period_attendance
  FOR INSERT
  WITH CHECK (
    school_id = auth.jwt() ->> 'school_id'::text
    AND auth.jwt() ->> 'role' IN ('teacher', 'school_admin')
  );

CREATE POLICY "Enable update access for teachers and admins" ON period_attendance
  FOR UPDATE
  USING (
    school_id = auth.jwt() ->> 'school_id'::text
    AND auth.jwt() ->> 'role' IN ('teacher', 'school_admin')
  )
  WITH CHECK (
    school_id = auth.jwt() ->> 'school_id'::text
    AND auth.jwt() ->> 'role' IN ('teacher', 'school_admin')
  );

CREATE POLICY "Enable delete access for admins" ON period_attendance
  FOR DELETE
  USING (
    school_id = auth.jwt() ->> 'school_id'::text
    AND auth.jwt() ->> 'role' = 'school_admin'
  );

-- Create function for enhanced attendance statistics
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
  total_days INTEGER;
BEGIN
  -- Get total number of students
  SELECT COUNT(*) INTO student_count
  FROM students s
  WHERE s.school_id = school_id_param
    AND (grade_filter IS NULL OR s.grade = grade_filter)
    AND (section_filter IS NULL OR s.section = section_filter);

  -- Calculate total days in range
  total_days := end_date - start_date + 1;

  -- Return aggregated statistics
  RETURN QUERY
  WITH attendance_stats AS (
    SELECT
      COUNT(*) as total_records,
      COUNT(*) FILTER (WHERE status = 'present') as present_count,
      COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
      COUNT(*) FILTER (WHERE status = 'late') as late_count,
      COUNT(*) FILTER (WHERE status = 'excused') as excused_count,
      COALESCE(
        CAST(COUNT(*) FILTER (WHERE status = 'present') AS DECIMAL) /
        NULLIF(COUNT(*), 0),
        0
      ) as attendance_rate
    FROM (
      SELECT
        student_id,
        date,
        status
      FROM (
        SELECT
          student_id,
          date,
          status
        FROM attendance a
        WHERE NOT is_period_mode
        UNION ALL
        SELECT
          student_id,
          date,
          CASE
            WHEN COUNT(*) FILTER (WHERE status = 'present') > COUNT(*) / 2 THEN 'present'
            WHEN COUNT(*) FILTER (WHERE status = 'absent') > COUNT(*) / 2 THEN 'absent'
            WHEN COUNT(*) FILTER (WHERE status = 'late') > 0 THEN 'late'
            ELSE 'excused'
          END as status
        FROM period_attendance a
        WHERE is_period_mode
        GROUP BY student_id, date
      ) combined_attendance
      JOIN students s ON combined_attendance.student_id = s.id
      WHERE s.school_id = school_id_param
        AND combined_attendance.date BETWEEN start_date AND end_date
        AND (grade_filter IS NULL OR s.grade = grade_filter)
        AND (section_filter IS NULL OR s.section = section_filter)
    ) final_attendance
  ),
  daily_stats AS (
    SELECT
      a.date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      COALESCE(
        CAST(COUNT(*) FILTER (WHERE status = 'present') AS DECIMAL) /
        NULLIF(COUNT(*), 0),
        0
      ) as rate
    FROM (
      SELECT
        student_id,
        date,
        status
      FROM (
        SELECT
          student_id,
          date,
          status
        FROM attendance a
        WHERE NOT is_period_mode
        UNION ALL
        SELECT
          student_id,
          date,
          CASE
            WHEN COUNT(*) FILTER (WHERE status = 'present') > COUNT(*) / 2 THEN 'present'
            WHEN COUNT(*) FILTER (WHERE status = 'absent') > COUNT(*) / 2 THEN 'absent'
            WHEN COUNT(*) FILTER (WHERE status = 'late') > 0 THEN 'late'
            ELSE 'excused'
          END as status
        FROM period_attendance a
        WHERE is_period_mode
        GROUP BY student_id, date
      ) combined_attendance
      JOIN students s ON combined_attendance.student_id = s.id
      WHERE s.school_id = school_id_param
        AND combined_attendance.date BETWEEN start_date AND end_date
        AND (grade_filter IS NULL OR s.grade = grade_filter)
        AND (section_filter IS NULL OR s.section = section_filter)
    ) a
    GROUP BY a.date
    ORDER BY a.date
  ),
  grade_stats AS (
    SELECT
      s.grade,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'present') as present,
      COALESCE(
        CAST(COUNT(*) FILTER (WHERE status = 'present') AS DECIMAL) /
        NULLIF(COUNT(*), 0),
        0
      ) as rate
    FROM (
      SELECT
        student_id,
        date,
        status
      FROM (
        SELECT
          student_id,
          date,
          status
        FROM attendance a
        WHERE NOT is_period_mode
        UNION ALL
        SELECT
          student_id,
          date,
          CASE
            WHEN COUNT(*) FILTER (WHERE status = 'present') > COUNT(*) / 2 THEN 'present'
            WHEN COUNT(*) FILTER (WHERE status = 'absent') > COUNT(*) / 2 THEN 'absent'
            WHEN COUNT(*) FILTER (WHERE status = 'late') > 0 THEN 'late'
            ELSE 'excused'
          END as status
        FROM period_attendance a
        WHERE is_period_mode
        GROUP BY student_id, date
      ) combined_attendance
      JOIN students s ON combined_attendance.student_id = s.id
      WHERE s.school_id = school_id_param
        AND combined_attendance.date BETWEEN start_date AND end_date
        AND (grade_filter IS NULL OR s.grade = grade_filter)
        AND (section_filter IS NULL OR s.section = section_filter)
    ) a
    JOIN students s ON a.student_id = s.id
    GROUP BY s.grade
    ORDER BY s.grade
  )
  SELECT
    student_count as total_students,
    COALESCE(total_records, 0) as total_records,
    COALESCE(present_count, 0) as present_count,
    COALESCE(absent_count, 0) as absent_count,
    COALESCE(late_count, 0) as late_count,
    COALESCE(excused_count, 0) as excused_count,
    COALESCE(attendance_rate, 0) as attendance_rate,
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
$$ LANGUAGE plpgsql;

-- Create function for attendance pivot data
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
        a.date,
        jsonb_build_object(
          'periods',
          jsonb_object_agg(
            a.period_no::text,
            jsonb_build_object(
              'status', a.status,
              'recorded_by', u.first_name || ' ' || u.last_name,
              'notes', a.notes
            )
          )
        ) as daily_data
      FROM students s
      CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) AS dates(date)
      LEFT JOIN period_attendance a ON s.id = a.student_id
        AND a.date = dates.date
      LEFT JOIN users u ON a.recorded_by = u.id
      WHERE s.school_id = school_id_param
      GROUP BY s.id, s.full_name, s.admission_no, s.grade, s.section, a.date
    )
    SELECT
      sa.student_id,
      sa.student_name,
      sa.admission_no,
      sa.grade,
      sa.section,
      COALESCE(
        jsonb_object_agg(
          sa.date::text,
          sa.daily_data
        ) FILTER (WHERE sa.date IS NOT NULL),
        '{}'::jsonb
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
        jsonb_build_object(
          'status', COALESCE(a.status, 'no_record'),
          'recorded_by', CASE WHEN a.recorded_by IS NOT NULL 
                          THEN u.first_name || ' ' || u.last_name 
                          ELSE NULL END,
          'notes', a.notes
        ) as daily_data
      FROM students s
      CROSS JOIN generate_series(start_date, end_date, '1 day'::interval) AS dates(date)
      LEFT JOIN attendance_records a ON s.id = a.student_id
        AND a.date = dates.date
        AND a.school_id = school_id_param
      LEFT JOIN users u ON a.recorded_by = u.id
      WHERE s.school_id = school_id_param
    )
    SELECT
      sa.student_id,
      sa.student_name,
      sa.admission_no,
      sa.grade,
      sa.section,
      COALESCE(
        jsonb_object_agg(
          sa.date::text,
          sa.daily_data
        ) FILTER (WHERE sa.date IS NOT NULL),
        '{}'::jsonb
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
$$ LANGUAGE plpgsql; 