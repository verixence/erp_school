-- Migration 0023: Add marks summary function
-- This function provides aggregated marks statistics for school admin dashboard

CREATE OR REPLACE FUNCTION get_marks_summary(school_id uuid)
RETURNS TABLE (
  total_marks_entered integer,
  total_exams_conducted integer,
  average_performance numeric,
  pending_mark_entries integer,
  total_students_examined integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total marks entries that have been filled
    (SELECT COUNT(*)::integer 
     FROM marks m 
     WHERE m.school_id = get_marks_summary.school_id 
     AND m.marks_obtained IS NOT NULL)::integer as total_marks_entered,
    
    -- Total exam papers conducted (distinct exam papers with at least one mark entry)
    (SELECT COUNT(DISTINCT m.exam_paper_id)::integer 
     FROM marks m 
     WHERE m.school_id = get_marks_summary.school_id)::integer as total_exams_conducted,
    
    -- Average performance across all non-absent students
    (SELECT COALESCE(
       AVG((m.marks_obtained::numeric / ep.max_marks::numeric) * 100), 
       0
     )
     FROM marks m
     JOIN exam_papers ep ON m.exam_paper_id = ep.id
     WHERE m.school_id = get_marks_summary.school_id 
     AND m.marks_obtained IS NOT NULL 
     AND m.is_absent = false)::numeric as average_performance,
    
    -- Pending mark entries (marks created but not filled)
    (SELECT COUNT(*)::integer 
     FROM marks m 
     WHERE m.school_id = get_marks_summary.school_id 
     AND m.marks_obtained IS NULL 
     AND m.is_absent = false)::integer as pending_mark_entries,
    
    -- Total unique students who have been examined
    (SELECT COUNT(DISTINCT m.student_id)::integer 
     FROM marks m 
     WHERE m.school_id = get_marks_summary.school_id)::integer as total_students_examined;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_marks_summary(uuid) TO authenticated;

-- Add RLS policy to ensure users can only access their school's data
-- (The function itself already filters by school_id, but this is an additional safeguard)
CREATE POLICY "marks_summary_school_access" ON marks
  FOR SELECT USING (
    school_id IN (
      SELECT u.school_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('school_admin', 'teacher')
    )
  ); 