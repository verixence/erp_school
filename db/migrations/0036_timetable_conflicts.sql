-- Create a function to get teacher conflicts
CREATE OR REPLACE FUNCTION get_teacher_conflicts(
  p_weekday INTEGER,
  p_period INTEGER,
  p_teacher UUID,
  p_current_section UUID
)
RETURNS TABLE (
  id UUID,
  section_id UUID,
  section_grade INTEGER,
  section_name TEXT,
  teacher_id UUID,
  teacher_first_name TEXT,
  teacher_last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    s.id AS section_id,
    s.grade AS section_grade,
    s.section AS section_name,
    u.id AS teacher_id,
    u.first_name AS teacher_first_name,
    u.last_name AS teacher_last_name
  FROM periods p
  INNER JOIN sections s ON p.section_id = s.id
  INNER JOIN users u ON p.teacher_id = u.id
  WHERE p.weekday = p_weekday
    AND p.period_no = p_period
    AND p.teacher_id = p_teacher
    AND s.id != p_current_section;
END;
$$ LANGUAGE plpgsql; 