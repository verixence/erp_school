-- Migration: Add Telangana State Board Support
-- Purpose: Implement flexible subject configuration, FA/SA assessments, and monthly attendance

-- ============================================
-- ENHANCE SCHOOLS TABLE FOR MULTI-BOARD SUPPORT
-- ============================================

-- Add state_board_type for more granular board classification
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS state_board_type text CHECK (state_board_type IN ('Telangana', 'AP', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Other')),
ADD COLUMN IF NOT EXISTS assessment_pattern text CHECK (assessment_pattern IN ('CBSE', 'State_FA_SA', 'Continuous', 'Other')) DEFAULT 'CBSE';

-- Create index for board type queries
CREATE INDEX IF NOT EXISTS idx_schools_state_board_type 
ON public.schools(state_board_type) 
WHERE state_board_type IS NOT NULL;

-- ============================================
-- FLEXIBLE SUBJECT CONFIGURATION PER SCHOOL
-- ============================================

-- Create school_subjects table for dynamic subject management
CREATE TABLE IF NOT EXISTS public.school_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  subject_code text,
  grade integer NOT NULL CHECK (grade BETWEEN 1 AND 12),
  academic_year text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 1,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, subject_name, grade, academic_year)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_school_subjects_school_grade 
ON public.school_subjects(school_id, grade, academic_year);

CREATE INDEX IF NOT EXISTS idx_school_subjects_active 
ON public.school_subjects(school_id, is_active) 
WHERE is_active = true;

-- ============================================
-- ENHANCE EXAM GROUPS FOR STATE BOARD
-- ============================================

-- Add State Board specific fields to exam_groups
ALTER TABLE public.exam_groups 
ADD COLUMN IF NOT EXISTS assessment_type text CHECK (assessment_type IN ('FA', 'SA', 'Unit_Test', 'Monthly', 'Other')),
ADD COLUMN IF NOT EXISTS assessment_number integer CHECK (assessment_number BETWEEN 1 AND 4),
ADD COLUMN IF NOT EXISTS total_marks integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS state_board_term text CHECK (state_board_term IN ('Term1', 'Term2', 'Annual'));

-- Update exam_type constraint to include State Board types
ALTER TABLE public.exam_groups 
DROP CONSTRAINT IF EXISTS exam_groups_exam_type_check;

ALTER TABLE public.exam_groups 
ADD CONSTRAINT exam_groups_exam_type_check 
CHECK (exam_type IN (
  'monthly', 'quarterly', 'half_yearly', 'annual', 'unit_test', 'other',
  'cbse_fa1', 'cbse_fa2', 'cbse_sa1', 'cbse_fa3', 'cbse_fa4', 'cbse_sa2',
  'state_fa1', 'state_fa2', 'state_fa3', 'state_fa4',
  'state_sa1', 'state_sa2', 'state_sa3'
));

-- Create indexes for State Board queries
CREATE INDEX IF NOT EXISTS idx_exam_groups_assessment_type 
ON public.exam_groups(school_id, assessment_type, assessment_number) 
WHERE assessment_type IS NOT NULL;

-- ============================================
-- ENHANCE EXAM PAPERS FOR FLEXIBLE MARKS
-- ============================================

-- Add subject_id reference to link with school_subjects
ALTER TABLE public.exam_papers 
ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.school_subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS internal_marks integer DEFAULT 0, -- For SA internal component
ADD COLUMN IF NOT EXISTS written_marks integer DEFAULT 100; -- For SA written component

-- Create index for subject-based queries
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject_id 
ON public.exam_papers(subject_id);

-- ============================================
-- GRADING CONFIGURATION TABLE
-- ============================================

-- Create configurable grading scales per school and assessment type
CREATE TABLE IF NOT EXISTS public.grading_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN ('FA', 'SA', 'Overall')),
  max_total_marks integer NOT NULL,
  grade_bands jsonb NOT NULL, -- Array of {min, max, grade, remark}
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, assessment_type, max_total_marks)
);

-- Insert default Telangana State Board grading scales
INSERT INTO public.grading_scales (school_id, assessment_type, max_total_marks, grade_bands, is_active) 
SELECT DISTINCT s.id, 'FA', 20, 
'[
  {"min": 19, "max": 20, "grade": "O", "remark": "Outstanding"},
  {"min": 15, "max": 18, "grade": "A", "remark": "Very Good"},
  {"min": 11, "max": 14, "grade": "B", "remark": "Good"},
  {"min": 6, "max": 10, "grade": "C", "remark": "Pass"},
  {"min": 0, "max": 5, "grade": "D", "remark": "Work Hard"}
]'::jsonb, true
FROM public.schools s 
WHERE s.state_board_type = 'Telangana'
ON CONFLICT DO NOTHING;

INSERT INTO public.grading_scales (school_id, assessment_type, max_total_marks, grade_bands, is_active) 
SELECT DISTINCT s.id, 'SA', 600, 
'[
  {"min": 540, "max": 600, "grade": "O", "remark": "Outstanding"},
  {"min": 432, "max": 539, "grade": "A", "remark": "Excellent"},
  {"min": 312, "max": 431, "grade": "B", "remark": "Good"},
  {"min": 205, "max": 311, "grade": "C", "remark": "Pass"},
  {"min": 0, "max": 204, "grade": "D", "remark": "Need to Improve"}
]'::jsonb, true
FROM public.schools s 
WHERE s.state_board_type = 'Telangana'
ON CONFLICT DO NOTHING;

-- Create index for grading queries
CREATE INDEX IF NOT EXISTS idx_grading_scales_school_type 
ON public.grading_scales(school_id, assessment_type, is_active);

-- ============================================
-- MONTHLY ATTENDANCE TRACKING
-- ============================================

-- Create monthly attendance summary table
CREATE TABLE IF NOT EXISTS public.monthly_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_group_id uuid REFERENCES public.exam_groups(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2030),
  working_days integer NOT NULL DEFAULT 0,
  present_days integer NOT NULL DEFAULT 0,
  attendance_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN working_days > 0 THEN (present_days::decimal / working_days::decimal * 100)
      ELSE 0 
    END
  ) STORED,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, school_id, month, year)
);

-- Create indexes for efficient attendance queries
CREATE INDEX IF NOT EXISTS idx_monthly_attendance_student_year 
ON public.monthly_attendance(student_id, year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_attendance_school_exam 
ON public.monthly_attendance(school_id, exam_group_id);

-- ============================================
-- STATE BOARD REPORT CARDS TABLE
-- ============================================

-- Create state board specific report cards table
CREATE TABLE IF NOT EXISTS public.state_board_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_group_id uuid NOT NULL REFERENCES public.exam_groups(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('FA', 'SA', 'Annual')),
  assessment_number integer CHECK (assessment_number BETWEEN 1 AND 4),
  
  -- Subject-wise performance (stored as JSONB for flexibility)
  subject_marks jsonb NOT NULL DEFAULT '[]', -- Array of subject performance objects
  
  -- Overall performance
  total_marks integer NOT NULL DEFAULT 0,
  obtained_marks integer NOT NULL DEFAULT 0,
  percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_marks > 0 THEN (obtained_marks::decimal / total_marks::decimal * 100)
      ELSE 0 
    END
  ) STORED,
  overall_grade text,
  overall_remark text,
  
  -- Attendance summary
  attendance_data jsonb DEFAULT '{}', -- Monthly attendance breakdown
  
  -- Report status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'distributed')),
  is_published boolean DEFAULT false,
  published_at timestamptz,
  
  -- Metadata
  generated_by uuid REFERENCES public.users(id),
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(student_id, exam_group_id, academic_year)
);

-- Create indexes for efficient report queries
CREATE INDEX IF NOT EXISTS idx_state_board_reports_student_year 
ON public.state_board_reports(student_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_state_board_reports_school_type 
ON public.state_board_reports(school_id, report_type, assessment_number);

CREATE INDEX IF NOT EXISTS idx_state_board_reports_exam_group 
ON public.state_board_reports(exam_group_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_board_reports ENABLE ROW LEVEL SECURITY;

-- School Subjects RLS
CREATE POLICY "school_subjects_school_access" ON public.school_subjects
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'school_admin', 'teacher')
    )
  );

-- Grading Scales RLS
CREATE POLICY "grading_scales_school_access" ON public.grading_scales
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'school_admin', 'teacher')
    )
  );

-- Monthly Attendance RLS
CREATE POLICY "monthly_attendance_school_access" ON public.monthly_attendance
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'school_admin', 'teacher')
    )
    OR 
    -- Parents can view their children's attendance
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

-- State Board Reports RLS
CREATE POLICY "state_board_reports_school_access" ON public.state_board_reports
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'school_admin', 'teacher')
    )
    OR 
    -- Parents can view their children's reports
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate grade from marks and assessment type
CREATE OR REPLACE FUNCTION calculate_state_board_grade(
  p_marks integer,
  p_max_marks integer,
  p_school_id uuid,
  p_assessment_type text
) RETURNS TABLE(grade text, remark text) AS $$
DECLARE
  grade_band jsonb;
  percentage decimal(5,2);
BEGIN
  -- Calculate percentage
  percentage := (p_marks::decimal / p_max_marks::decimal) * 100;
  
  -- Get grading scale for school and assessment type
  SELECT gb INTO grade_band
  FROM public.grading_scales gs,
       jsonb_array_elements(gs.grade_bands) gb
  WHERE gs.school_id = p_school_id
    AND gs.assessment_type = p_assessment_type
    AND gs.is_active = true
    AND percentage >= (gb->>'min')::integer
    AND percentage <= (gb->>'max')::integer
  ORDER BY (gb->>'min')::integer DESC
  LIMIT 1;
  
  IF grade_band IS NOT NULL THEN
    RETURN QUERY SELECT grade_band->>'grade', grade_band->>'remark';
  ELSE
    -- Default fallback
    RETURN QUERY SELECT 'D'::text, 'Need Assessment'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get school subjects for a grade and academic year
CREATE OR REPLACE FUNCTION get_school_subjects(
  p_school_id uuid,
  p_grade integer,
  p_academic_year text
) RETURNS TABLE(
  id uuid,
  subject_name text,
  subject_code text,
  display_order integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.subject_name,
    ss.subject_code,
    ss.display_order
  FROM public.school_subjects ss
  WHERE ss.school_id = p_school_id
    AND ss.grade = p_grade
    AND ss.academic_year = p_academic_year
    AND ss.is_active = true
  ORDER BY ss.display_order, ss.subject_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_state_board_grade(integer, integer, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_subjects(uuid, integer, text) TO authenticated;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Create triggers for updated_at fields
CREATE TRIGGER school_subjects_updated_at
  BEFORE UPDATE ON public.school_subjects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER grading_scales_updated_at
  BEFORE UPDATE ON public.grading_scales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER monthly_attendance_updated_at
  BEFORE UPDATE ON public.monthly_attendance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER state_board_reports_updated_at
  BEFORE UPDATE ON public.state_board_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 