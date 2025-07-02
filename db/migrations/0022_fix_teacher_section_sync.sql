-- Migration 0022: Fix Teacher-Section Sync
-- Ensure section_teachers junction table is properly maintained

-- Function to sync section_teachers table when class teacher is assigned
CREATE OR REPLACE FUNCTION sync_section_teacher_assignments()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT or UPDATE of sections table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Remove old class teacher assignment if changing
    IF TG_OP = 'UPDATE' AND OLD.class_teacher IS DISTINCT FROM NEW.class_teacher THEN
      DELETE FROM public.section_teachers 
      WHERE section_id = NEW.id 
        AND teacher_id = OLD.class_teacher
        AND NOT EXISTS (
          -- Keep if teacher still teaches periods in this section
          SELECT 1 FROM public.periods p 
          WHERE p.section_id = NEW.id AND p.teacher_id = OLD.class_teacher
        );
    END IF;
    
    -- Add new class teacher assignment
    IF NEW.class_teacher IS NOT NULL THEN
      INSERT INTO public.section_teachers (section_id, teacher_id)
      VALUES (NEW.id, NEW.class_teacher)
      ON CONFLICT (section_id, teacher_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE of sections table
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.section_teachers WHERE section_id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to sync section_teachers table when periods are assigned
CREATE OR REPLACE FUNCTION sync_period_teacher_assignments()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT or UPDATE of periods table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Remove old teacher assignment if changing
    IF TG_OP = 'UPDATE' AND OLD.teacher_id IS DISTINCT FROM NEW.teacher_id THEN
      DELETE FROM public.section_teachers 
      WHERE section_id = NEW.section_id 
        AND teacher_id = OLD.teacher_id
        AND NOT EXISTS (
          -- Keep if teacher is class teacher or teaches other periods in this section
          SELECT 1 FROM public.sections s 
          WHERE s.id = NEW.section_id AND s.class_teacher = OLD.teacher_id
          UNION
          SELECT 1 FROM public.periods p 
          WHERE p.section_id = NEW.section_id AND p.teacher_id = OLD.teacher_id AND p.id != NEW.id
        );
    END IF;
    
    -- Add new teacher assignment
    IF NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.section_teachers (section_id, teacher_id)
      VALUES (NEW.section_id, NEW.teacher_id)
      ON CONFLICT (section_id, teacher_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE of periods table
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.section_teachers 
    WHERE section_id = OLD.section_id 
      AND teacher_id = OLD.teacher_id
      AND NOT EXISTS (
        -- Keep if teacher is class teacher or teaches other periods in this section
        SELECT 1 FROM public.sections s 
        WHERE s.id = OLD.section_id AND s.class_teacher = OLD.teacher_id
        UNION
        SELECT 1 FROM public.periods p 
        WHERE p.section_id = OLD.section_id AND p.teacher_id = OLD.teacher_id AND p.id != OLD.id
      );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update students_count in sections table
CREATE OR REPLACE FUNCTION update_section_students_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the count for the affected section
  IF TG_OP = 'INSERT' THEN
    UPDATE public.sections 
    SET students_count = (
      SELECT COUNT(*) FROM public.students 
      WHERE section_id = NEW.section_id
    )
    WHERE id = NEW.section_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.sections 
    SET students_count = (
      SELECT COUNT(*) FROM public.students 
      WHERE section_id = OLD.section_id
    )
    WHERE id = OLD.section_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update old section count if section changed
    IF OLD.section_id IS DISTINCT FROM NEW.section_id THEN
      UPDATE public.sections 
      SET students_count = (
        SELECT COUNT(*) FROM public.students 
        WHERE section_id = OLD.section_id
      )
      WHERE id = OLD.section_id;
    END IF;
    
    -- Update new section count
    UPDATE public.sections 
    SET students_count = (
      SELECT COUNT(*) FROM public.students 
      WHERE section_id = NEW.section_id
    )
    WHERE id = NEW.section_id;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sections table
DROP TRIGGER IF EXISTS trigger_sync_section_teachers ON public.sections;
CREATE TRIGGER trigger_sync_section_teachers
  AFTER INSERT OR UPDATE OR DELETE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION sync_section_teacher_assignments();

-- Create triggers for periods table
DROP TRIGGER IF EXISTS trigger_sync_period_teachers ON public.periods;
CREATE TRIGGER trigger_sync_period_teachers
  AFTER INSERT OR UPDATE OR DELETE ON public.periods
  FOR EACH ROW EXECUTE FUNCTION sync_period_teacher_assignments();

-- Create triggers for students table to update section counts
DROP TRIGGER IF EXISTS trigger_update_section_count ON public.students;
CREATE TRIGGER trigger_update_section_count
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_section_students_count();

-- Add students_count column to sections table if it doesn't exist
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS students_count INTEGER DEFAULT 0;

-- Update existing students_count for all sections
UPDATE public.sections 
SET students_count = (
  SELECT COUNT(*) 
  FROM public.students 
  WHERE students.section_id = sections.id
);

-- Backfill section_teachers table with existing data
INSERT INTO public.section_teachers (section_id, teacher_id)
SELECT DISTINCT s.id, s.class_teacher
FROM public.sections s
WHERE s.class_teacher IS NOT NULL
ON CONFLICT (section_id, teacher_id) DO NOTHING;

INSERT INTO public.section_teachers (section_id, teacher_id)
SELECT DISTINCT p.section_id, p.teacher_id
FROM public.periods p
WHERE p.teacher_id IS NOT NULL
ON CONFLICT (section_id, teacher_id) DO NOTHING; 