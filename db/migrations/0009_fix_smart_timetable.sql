-- Fix for Smart Timetable Migration
-- Run this to clean up and properly insert default data

-- First, clean up any problematic rows
DELETE FROM public.school_period_settings WHERE day_of_week IS NULL OR period_number IS NULL;

-- Insert default period settings for schools (8 periods, Mon-Sat)
-- This uses proper CROSS JOIN to avoid NULL issues
INSERT INTO public.school_period_settings (school_id, grade_group, day_of_week, period_number, start_time, end_time, is_break)
SELECT 
  s.id as school_id,
  'all' as grade_group,
  days.day_of_week,
  periods.period_number,
  ('08:00:00'::time + (periods.period_number - 1) * interval '45 minutes') as start_time,
  ('08:45:00'::time + (periods.period_number - 1) * interval '45 minutes') as end_time,
  FALSE as is_break
FROM public.schools s
CROSS JOIN generate_series(0, 5) AS days(day_of_week) -- Monday to Saturday  
CROSS JOIN generate_series(1, 8) AS periods(period_number)
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_period_settings sps 
  WHERE sps.school_id = s.id 
    AND sps.day_of_week = days.day_of_week 
    AND sps.period_number = periods.period_number
);

-- Insert lunch break (period 4 becomes 30-minute break)
UPDATE public.school_period_settings 
SET is_break = TRUE, 
    period_name = 'Lunch Break',
    start_time = '11:15:00',
    end_time = '11:45:00'
WHERE period_number = 4 AND grade_group = 'all' AND is_break = FALSE; 