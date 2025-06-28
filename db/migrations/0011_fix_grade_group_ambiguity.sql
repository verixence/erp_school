-- Migration 0011: Fix ambiguous grade_group reference in get_school_period_config function
-- This fixes the PostgreSQL error: column reference "grade_group" is ambiguous

-- Fix the get_school_period_config function
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
  v_grade_group TEXT;
BEGIN
  -- Determine grade group if grade is provided
  IF p_grade IS NOT NULL THEN
    v_grade_group := CASE 
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
        WHEN sps.grade_group = v_grade_group THEN 2    -- Grade group match
        WHEN sps.grade_group = 'all' THEN 3          -- Default fallback
        ELSE 4
      END as priority
    FROM public.school_period_settings sps
    WHERE sps.school_id = p_school_id 
      AND sps.is_active = TRUE
      AND (
        sps.grade_group = p_grade::text OR
        sps.grade_group = v_grade_group OR 
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