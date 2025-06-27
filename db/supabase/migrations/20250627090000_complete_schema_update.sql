-- Complete Schema Update Migration
-- This migration includes all missing schema changes and fixes column issues

-- 1. Add students_count column to sections table (if not exists)
ALTER TABLE public.sections 
ADD COLUMN IF NOT EXISTS students_count INTEGER DEFAULT 0;

-- 2. Add section_id column to students table (if not exists)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- 3. Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);

-- 4. Create function to update students_count in sections
CREATE OR REPLACE FUNCTION update_section_students_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update count for old section (if any)
  IF OLD.section_id IS NOT NULL THEN
    UPDATE public.sections 
    SET students_count = (
      SELECT COUNT(*) 
      FROM public.students 
      WHERE section_id = OLD.section_id
    )
    WHERE id = OLD.section_id;
  END IF;
  
  -- Update count for new section (if any)
  IF NEW.section_id IS NOT NULL THEN
    UPDATE public.sections 
    SET students_count = (
      SELECT COUNT(*) 
      FROM public.students 
      WHERE section_id = NEW.section_id
    )
    WHERE id = NEW.section_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update students_count
DROP TRIGGER IF EXISTS trigger_update_section_students_count ON public.students;
CREATE TRIGGER trigger_update_section_students_count
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_section_students_count();

-- 6. Initialize students_count for existing sections
UPDATE public.sections 
SET students_count = (
  SELECT COUNT(*) 
  FROM public.students 
  WHERE students.section_id = sections.id
);

-- 7. Migrate existing students to sections based on grade and section text fields
UPDATE public.students 
SET section_id = sections.id
FROM public.sections
WHERE students.school_id = sections.school_id
  AND students.grade::integer = sections.grade
  AND students.section = sections.section
  AND students.section_id IS NULL;

-- 8. Update students_count after migration
UPDATE public.sections 
SET students_count = (
  SELECT COUNT(*) 
  FROM public.students 
  WHERE students.section_id = sections.id
);

-- 9. Add RLS policy for students to be visible by their section's class teacher
DROP POLICY IF EXISTS "students_section_teacher_policy" ON public.students;
CREATE POLICY "students_section_teacher_policy" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sections s
      WHERE s.id = students.section_id
      AND s.class_teacher = auth.uid()
    )
  );

-- 10. Update bulk_create_students_with_parents function to handle section_id properly
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
      
      -- If section not found, create error
      IF section_id IS NULL THEN
        RAISE EXCEPTION 'Section not found for grade % section %', 
          student_record->>'grade', student_record->>'section';
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
      IF student_record->>'parent_emails' IS NOT NULL AND trim(student_record->>'parent_emails') != '' THEN
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
      END IF;
      
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