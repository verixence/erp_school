-- Migration: Fix text grade (NURSERY, LKG, UKG) support in bulk_create_students_with_parents function
-- This fixes the "invalid input syntax for type integer: NURSERY" error

CREATE OR REPLACE FUNCTION public.bulk_create_students_with_parents(
  p_school_id uuid,
  p_students jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  student_record jsonb;
  student_id uuid;
  parent_id uuid;
  section_id uuid;
  result jsonb := '[]'::jsonb;
  success_count int := 0;
  error_count int := 0;
  parent_emails text[];
  parent_names text[];
  parent_phones text[];
  parent_relations text[];
  i int;
  grade_value text;
BEGIN
  FOR student_record IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    BEGIN
      -- Normalize grade value (handle both numeric and text grades)
      grade_value := student_record->>'grade';

      -- Find section_id based on grade and section
      -- Try to match using grade_text first (for text grades like NURSERY, LKG, UKG)
      SELECT id INTO section_id
      FROM public.sections
      WHERE school_id = p_school_id
        AND UPPER(COALESCE(grade_text, grade::text)) = UPPER(grade_value)
        AND section = UPPER(student_record->>'section');

      -- If not found and grade is numeric, try matching with integer grade column
      IF section_id IS NULL AND grade_value ~ '^\d+$' THEN
        SELECT id INTO section_id
        FROM public.sections
        WHERE school_id = p_school_id
          AND grade = grade_value::int
          AND section = UPPER(student_record->>'section');
      END IF;

      -- If section not found, raise error
      IF section_id IS NULL THEN
        RAISE EXCEPTION 'Section not found for grade % section %',
          grade_value, student_record->>'section';
      END IF;

      -- Create student record
      INSERT INTO public.students (
        school_id, full_name, admission_no, grade, section, section_id,
        date_of_birth, gender, student_email, student_phone
      ) VALUES (
        p_school_id,
        student_record->>'full_name',
        student_record->>'admission_no',
        student_record->>'grade',
        UPPER(student_record->>'section'),
        section_id,
        (student_record->>'date_of_birth')::date,
        LOWER(student_record->>'gender'),
        NULLIF(student_record->>'student_email', ''),
        NULLIF(student_record->>'student_phone', '')
      ) RETURNING id INTO student_id;

      -- Parse parent information (semicolon-separated)
      parent_emails := string_to_array(student_record->>'parent_emails', ';');
      parent_names := string_to_array(student_record->>'parent_names', ';');
      parent_phones := string_to_array(COALESCE(student_record->>'parent_phones', ''), ';');
      parent_relations := string_to_array(COALESCE(student_record->>'parent_relations', 'parent'), ';');

      -- Create/link parents
      FOR i IN 1..array_length(parent_emails, 1)
      LOOP
        IF parent_emails[i] IS NOT NULL AND trim(parent_emails[i]) != '' THEN
          -- Split parent name into first and last
          DECLARE
            name_parts text[];
            first_name text;
            last_name text;
          BEGIN
            name_parts := string_to_array(trim(parent_names[i]), ' ');
            first_name := name_parts[1];
            last_name := CASE
              WHEN array_length(name_parts, 1) > 1
              THEN array_to_string(name_parts[2:], ' ')
              ELSE ''
            END;

            -- Find or create parent
            SELECT find_or_create_parent(
              p_school_id,
              trim(parent_emails[i]),
              first_name,
              last_name,
              NULLIF(trim(COALESCE(parent_phones[i], '')), ''),
              COALESCE(parent_relations[i], 'parent')
            ) INTO parent_id;

            -- Link parent to student
            PERFORM link_parent_to_student(parent_id, student_id);
          END;
        END IF;
      END LOOP;

      success_count := success_count + 1;
      result := result || jsonb_build_object(
        'admission_no', student_record->>'admission_no',
        'status', 'success',
        'student_id', student_id
      );

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      result := result || jsonb_build_object(
        'admission_no', student_record->>'admission_no',
        'status', 'error',
        'error', SQLERRM
      );
    END;
  END LOOP;

  return jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'results', result
  );
END;
$$;
