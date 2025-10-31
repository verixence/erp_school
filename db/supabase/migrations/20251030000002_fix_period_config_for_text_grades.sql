-- Migration: Fix get_school_period_config to support text grades (NURSERY, LKG, UKG)
-- Changes p_grade parameter from INTEGER to TEXT to support both numeric and text grades

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.get_school_period_config(uuid, integer);
DROP FUNCTION IF EXISTS public.get_school_period_config(uuid, text);

-- Create the new function with text parameter named p_grade
CREATE OR REPLACE FUNCTION public.get_school_period_config(
  p_school_id uuid,
  p_grade text DEFAULT NULL
)
RETURNS TABLE(day_of_week integer, day_name text, periods jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grade_group TEXT;
  best_grade_group TEXT;
  v_grade_numeric INTEGER;
BEGIN
  -- Determine grade group if grade is provided
  IF p_grade IS NOT NULL THEN
    -- Try to convert to numeric if it's a number
    BEGIN
      v_grade_numeric := p_grade::integer;

      -- For numeric grades, determine the grade group
      v_grade_group := CASE
        WHEN v_grade_numeric BETWEEN 1 AND 5 THEN '1-5'
        WHEN v_grade_numeric BETWEEN 6 AND 10 THEN '6-10'
        WHEN v_grade_numeric BETWEEN 11 AND 12 THEN '11-12'
        ELSE 'all'
      END;
    EXCEPTION WHEN OTHERS THEN
      -- For text grades (NURSERY, LKG, UKG, etc.), use lowercase as grade group
      v_grade_numeric := NULL;
      v_grade_group := LOWER(p_grade);
    END;
  END IF;

  -- Find the best matching grade group (highest priority)
  SELECT grade_group INTO best_grade_group
  FROM public.school_period_settings sps
  WHERE sps.school_id = p_school_id
    AND sps.is_active = TRUE
    AND (
      sps.grade_group = p_grade OR                    -- Exact match (numeric or text)
      sps.grade_group = LOWER(p_grade) OR             -- Lowercase text match
      sps.grade_group = v_grade_group OR              -- Grade group match
      sps.grade_group = 'all'                         -- Default fallback
    )
  ORDER BY
    CASE
      WHEN sps.grade_group = p_grade THEN 1           -- Exact match (highest priority)
      WHEN sps.grade_group = LOWER(p_grade) THEN 1    -- Lowercase exact match
      WHEN sps.grade_group = v_grade_group THEN 2     -- Grade group match
      WHEN sps.grade_group = 'all' THEN 3             -- Default fallback
      ELSE 4
    END
  LIMIT 1;

  -- Now only return periods from the best matching grade group
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
        'duration_minutes', EXTRACT(EPOCH FROM (sps.end_time - sps.start_time))/60,
        'grade_group_used', sps.grade_group,
        'priority_used', CASE
          WHEN sps.grade_group = p_grade THEN 1
          WHEN sps.grade_group = LOWER(p_grade) THEN 1
          WHEN sps.grade_group = v_grade_group THEN 2
          WHEN sps.grade_group = 'all' THEN 3
          ELSE 4
        END
      ) ORDER BY sps.period_number
    ) as periods
  FROM public.school_period_settings sps
  WHERE sps.school_id = p_school_id
    AND sps.is_active = TRUE
    AND sps.grade_group = best_grade_group
  GROUP BY sps.day_of_week
  ORDER BY sps.day_of_week;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_school_period_config IS 'Gets school period configuration for a specific grade. Supports both numeric grades (1-12) and text grades (nursery, lkg, ukg, etc.). Returns the most specific matching configuration.';
