-- Migration: Add Default CBSE Exam Groups
-- Purpose: Add default exam groups for CBSE schools

-- Function to create CBSE exam groups for a school
CREATE OR REPLACE FUNCTION create_cbse_exam_groups(p_school_id UUID, p_academic_year TEXT)
RETURNS void AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Term 1 Exam Groups
  -- FA1 (July-August)
  v_start_date := (p_academic_year || '-07-01')::DATE;
  v_end_date := (p_academic_year || '-08-31')::DATE;
  
  INSERT INTO public.exam_groups (
    school_id, name, description, exam_type, 
    start_date, end_date, is_published,
    cbse_term, cbse_exam_type
  ) VALUES (
    p_school_id,
    'FA1 ' || p_academic_year,
    'Formative Assessment 1',
    'cbse_fa1',
    v_start_date,
    v_end_date,
    true,
    'Term1',
    'FA1'
  ) ON CONFLICT DO NOTHING;

  -- FA2 (September-October)
  v_start_date := (p_academic_year || '-09-01')::DATE;
  v_end_date := (p_academic_year || '-10-31')::DATE;
  
  INSERT INTO public.exam_groups (
    school_id, name, description, exam_type, 
    start_date, end_date, is_published,
    cbse_term, cbse_exam_type
  ) VALUES (
    p_school_id,
    'FA2 ' || p_academic_year,
    'Formative Assessment 2',
    'cbse_fa2',
    v_start_date,
    v_end_date,
    true,
    'Term1',
    'FA2'
  ) ON CONFLICT DO NOTHING;

  -- SA1 (November-December)
  v_start_date := (p_academic_year || '-11-01')::DATE;
  v_end_date := (p_academic_year || '-12-31')::DATE;
  
  INSERT INTO public.exam_groups (
    school_id, name, description, exam_type, 
    start_date, end_date, is_published,
    cbse_term, cbse_exam_type
  ) VALUES (
    p_school_id,
    'SA1 ' || p_academic_year,
    'Summative Assessment 1',
    'cbse_sa1',
    v_start_date,
    v_end_date,
    true,
    'Term1',
    'SA1'
  ) ON CONFLICT DO NOTHING;

  -- Term 2 Exam Groups
  -- FA3 (January-February)
  v_start_date := ((p_academic_year::INTEGER + 1) || '-01-01')::DATE;
  v_end_date := ((p_academic_year::INTEGER + 1) || '-02-28')::DATE;
  
  INSERT INTO public.exam_groups (
    school_id, name, description, exam_type, 
    start_date, end_date, is_published,
    cbse_term, cbse_exam_type
  ) VALUES (
    p_school_id,
    'FA3 ' || p_academic_year,
    'Formative Assessment 3',
    'cbse_fa3',
    v_start_date,
    v_end_date,
    true,
    'Term2',
    'FA3'
  ) ON CONFLICT DO NOTHING;

  -- FA4 (March)
  v_start_date := ((p_academic_year::INTEGER + 1) || '-03-01')::DATE;
  v_end_date := ((p_academic_year::INTEGER + 1) || '-03-31')::DATE;
  
  INSERT INTO public.exam_groups (
    school_id, name, description, exam_type, 
    start_date, end_date, is_published,
    cbse_term, cbse_exam_type
  ) VALUES (
    p_school_id,
    'FA4 ' || p_academic_year,
    'Formative Assessment 4',
    'cbse_fa4',
    v_start_date,
    v_end_date,
    true,
    'Term2',
    'FA4'
  ) ON CONFLICT DO NOTHING;

  -- SA2 (March-April)
  v_start_date := ((p_academic_year::INTEGER + 1) || '-03-15')::DATE;
  v_end_date := ((p_academic_year::INTEGER + 1) || '-04-30')::DATE;
  
  INSERT INTO public.exam_groups (
    school_id, name, description, exam_type, 
    start_date, end_date, is_published,
    cbse_term, cbse_exam_type
  ) VALUES (
    p_school_id,
    'SA2 ' || p_academic_year,
    'Summative Assessment 2',
    'cbse_sa2',
    v_start_date,
    v_end_date,
    true,
    'Term2',
    'SA2'
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create CBSE exam groups for all CBSE schools
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, academic_year FROM public.schools WHERE board_type = 'CBSE'
  LOOP
    PERFORM create_cbse_exam_groups(r.id, r.academic_year);
  END LOOP;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_cbse_exam_groups(UUID, TEXT) TO authenticated; 