-- Migration: Create CBSE Generated Reports Table and Helper Function
-- Purpose: Add table to store generated CBSE report cards and the function to create it

-- ============================================
-- CBSE GENERATED REPORTS TABLE
-- ============================================

-- Create the cbse_generated_reports table
CREATE TABLE IF NOT EXISTS public.cbse_generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  report_type text CHECK (report_type IN ('Term1', 'Term2', 'Cumulative')) NOT NULL,
  academic_year text NOT NULL DEFAULT '2024-25',
  status text CHECK (status IN ('draft', 'generated', 'published', 'distributed')) DEFAULT 'draft',
  published boolean DEFAULT false,
  published_at timestamptz,
  generated_at timestamptz,
  distributed_at timestamptz,
  report_data jsonb, -- Store the complete CBSE report data
  pdf_url text, -- URL to generated PDF if applicable
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one report per student per term per academic year
  UNIQUE(school_id, student_id, report_type, academic_year)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cbse_reports_school_id 
ON public.cbse_generated_reports(school_id);

CREATE INDEX IF NOT EXISTS idx_cbse_reports_student_id 
ON public.cbse_generated_reports(student_id);

CREATE INDEX IF NOT EXISTS idx_cbse_reports_type_year 
ON public.cbse_generated_reports(school_id, report_type, academic_year);

CREATE INDEX IF NOT EXISTS idx_cbse_reports_status 
ON public.cbse_generated_reports(school_id, status);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on the table
ALTER TABLE public.cbse_generated_reports ENABLE ROW LEVEL SECURITY;

-- Super admins can view all CBSE reports
CREATE POLICY "cbse_reports_super_admin_all" ON public.cbse_generated_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- School admins can manage their school's CBSE reports
CREATE POLICY "cbse_reports_school_admin_manage" ON public.cbse_generated_reports
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT users.school_id FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'school_admin'
    )
  );

-- Teachers can view CBSE reports from their school
CREATE POLICY "cbse_reports_teacher_view" ON public.cbse_generated_reports
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT users.school_id FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'teacher'
    )
  );

-- Parents can view their children's published CBSE reports
CREATE POLICY "cbse_reports_parent_view" ON public.cbse_generated_reports
  FOR SELECT TO authenticated
  USING (
    published = true 
    AND student_id IN (
      SELECT students.id FROM public.students 
      WHERE students.parent_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create CBSE reports table if it doesn't exist (for backward compatibility)
CREATE OR REPLACE FUNCTION create_cbse_reports_table_if_not_exists()
RETURNS boolean AS $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cbse_generated_reports'
  ) THEN
    RETURN true;
  END IF;
  
  -- If we reach here, table doesn't exist, but since we're creating it in this migration,
  -- this function will mainly serve as a compatibility check
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get CBSE report statistics for a school
CREATE OR REPLACE FUNCTION get_cbse_report_stats(p_school_id uuid)
RETURNS TABLE(
  total_reports bigint,
  published_reports bigint,
  term1_reports bigint,
  term2_reports bigint,
  cumulative_reports bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_reports,
    COUNT(*) FILTER (WHERE published = true)::bigint as published_reports,
    COUNT(*) FILTER (WHERE report_type = 'Term1')::bigint as term1_reports,
    COUNT(*) FILTER (WHERE report_type = 'Term2')::bigint as term2_reports,
    COUNT(*) FILTER (WHERE report_type = 'Cumulative')::bigint as cumulative_reports
  FROM public.cbse_generated_reports
  WHERE school_id = p_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_cbse_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cbse_reports_updated_at_trigger
  BEFORE UPDATE ON public.cbse_generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_cbse_reports_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION create_cbse_reports_table_if_not_exists() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_cbse_report_stats(uuid) TO authenticated, anon; 