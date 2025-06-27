-- Migration: fix_users_id_and_functions.sql
-- Fix users table ID generation and improve teacher/parent creation

-- Fix users table to auto-generate IDs
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add a function to create teacher with user account
CREATE OR REPLACE FUNCTION create_teacher_with_user(
  p_school_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_employee_id text DEFAULT NULL,
  p_subjects text[] DEFAULT '{}'::text[],
  p_department text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_teacher_id uuid;
BEGIN
  -- Create user account first
  INSERT INTO public.users (email, role, school_id, first_name, last_name, phone)
  VALUES (p_email, 'teacher', p_school_id, p_first_name, p_last_name, p_phone)
  RETURNING id INTO v_user_id;
  
  -- Create teacher record
  INSERT INTO public.teachers (
    user_id, school_id, employee_id, first_name, last_name, 
    email, phone, department, subjects, status
  ) VALUES (
    v_user_id, p_school_id, 
    COALESCE(p_employee_id, 'EMP' || extract(epoch from now())::text || substring(md5(random()::text), 1, 4)),
    p_first_name, p_last_name, p_email, p_phone, p_department, p_subjects, 'active'
  ) RETURNING id INTO v_teacher_id;
  
  RETURN v_teacher_id;
END;
$$;

-- Add a function to create parent with user account
CREATE OR REPLACE FUNCTION create_parent_with_user(
  p_school_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_relation text DEFAULT 'parent'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create user account
  INSERT INTO public.users (email, role, school_id, first_name, last_name, phone, relation)
  VALUES (p_email, 'parent', p_school_id, p_first_name, p_last_name, p_phone, p_relation)
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- Add a function to link parent to student
CREATE OR REPLACE FUNCTION link_parent_to_student(
  p_parent_id uuid,
  p_student_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Insert into student_parents table (handles duplicates with ON CONFLICT)
  INSERT INTO public.student_parents (student_id, parent_id)
  VALUES (p_student_id, p_parent_id)
  ON CONFLICT (student_id, parent_id) DO NOTHING;
END;
$$;

-- Add a function to bulk create teachers
CREATE OR REPLACE FUNCTION bulk_create_teachers(
  p_school_id uuid,
  p_teachers jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  teacher_record jsonb;
  teacher_id uuid;
  result jsonb := '[]'::jsonb;
  success_count int := 0;
  error_count int := 0;
BEGIN
  FOR teacher_record IN SELECT * FROM jsonb_array_elements(p_teachers)
  LOOP
    BEGIN
      SELECT create_teacher_with_user(
        p_school_id,
        teacher_record->>'email',
        teacher_record->>'first_name',
        teacher_record->>'last_name',
        teacher_record->>'phone',
        teacher_record->>'employee_id',
        CASE 
          WHEN teacher_record->>'subjects' IS NOT NULL 
          THEN string_to_array(teacher_record->>'subjects', ';')
          ELSE '{}'::text[]
        END,
        teacher_record->>'department'
      ) INTO teacher_id;
      
      success_count := success_count + 1;
      result := result || jsonb_build_object(
        'email', teacher_record->>'email',
        'status', 'success',
        'teacher_id', teacher_id
      );
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      result := result || jsonb_build_object(
        'email', teacher_record->>'email',
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

-- Function to find or create parent by email
CREATE OR REPLACE FUNCTION find_or_create_parent(
  p_school_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_relation text DEFAULT 'parent'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  -- Try to find existing parent by email
  SELECT id INTO v_parent_id
  FROM public.users
  WHERE email = p_email
    AND school_id = p_school_id
    AND role = 'parent';
  
  -- If not found, create new parent
  IF v_parent_id IS NULL THEN
    SELECT create_parent_with_user(
      p_school_id, p_email, p_first_name, p_last_name, p_phone, p_relation
    ) INTO v_parent_id;
  END IF;
  
  RETURN v_parent_id;
END;
$$;

-- Function to bulk create students with smart parent handling
CREATE OR REPLACE FUNCTION bulk_create_students_with_parents(
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
BEGIN
  FOR student_record IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    BEGIN
      -- Find section_id based on grade and section
      SELECT id INTO section_id
      FROM public.sections
      WHERE school_id = p_school_id
        AND grade = (student_record->>'grade')::int
        AND section = UPPER(student_record->>'section');
      
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
