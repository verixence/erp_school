-- Migration: Add CBSE Support to Exam Groups
-- Purpose: Add CBSE-specific fields and exam types for better board-specific exam management

-- ============================================
-- ENHANCE EXAM GROUPS TABLE FOR CBSE SUPPORT
-- ============================================

-- Add CBSE-specific fields to exam_groups table
ALTER TABLE public.exam_groups 
ADD COLUMN IF NOT EXISTS cbse_term text CHECK (cbse_term IN ('Term1', 'Term2')),
ADD COLUMN IF NOT EXISTS cbse_exam_type text CHECK (cbse_exam_type IN ('FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'));

-- Update the exam_type constraint to include CBSE exam types
ALTER TABLE public.exam_groups 
DROP CONSTRAINT IF EXISTS exam_groups_exam_type_check;

ALTER TABLE public.exam_groups 
ADD CONSTRAINT exam_groups_exam_type_check 
CHECK (exam_type IN (
  'monthly', 'quarterly', 'half_yearly', 'annual', 'unit_test', 'other',
  'cbse_fa1', 'cbse_fa2', 'cbse_sa1', 'cbse_fa3', 'cbse_fa4', 'cbse_sa2'
));

-- Add indexes for efficient CBSE exam group queries
CREATE INDEX IF NOT EXISTS idx_exam_groups_cbse_term 
ON public.exam_groups(school_id, cbse_term) 
WHERE cbse_term IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_groups_cbse_exam_type 
ON public.exam_groups(school_id, cbse_exam_type) 
WHERE cbse_exam_type IS NOT NULL;

-- ============================================
-- BOARD TYPE SUPPORT FOR SCHOOLS
-- ============================================

-- Add board_type field to schools table if it doesn't exist
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS board_type text CHECK (board_type IN ('CBSE', 'ICSE', 'State', 'IB', 'IGCSE', 'Other')),
ADD COLUMN IF NOT EXISTS grading_scale text CHECK (grading_scale IN ('CBSE_10POINT', 'PERCENTAGE', 'LETTER', 'OTHER')) DEFAULT 'PERCENTAGE',
ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2024-25';

-- Create index for board type queries
CREATE INDEX IF NOT EXISTS idx_schools_board_type 
ON public.schools(board_type) 
WHERE board_type IS NOT NULL;

-- ============================================
-- HELPER FUNCTIONS FOR CBSE EXAM MAPPING
-- ============================================

-- Function to map CBSE exam types to terms
CREATE OR REPLACE FUNCTION map_cbse_exam_to_term(exam_type text)
RETURNS text AS $$
BEGIN
  CASE exam_type
    WHEN 'cbse_fa1', 'cbse_fa2', 'cbse_sa1' THEN RETURN 'Term1';
    WHEN 'cbse_fa3', 'cbse_fa4', 'cbse_sa2' THEN RETURN 'Term2';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract CBSE exam type from exam_type
CREATE OR REPLACE FUNCTION extract_cbse_exam_type(exam_type text)
RETURNS text AS $$
BEGIN
  CASE exam_type
    WHEN 'cbse_fa1' THEN RETURN 'FA1';
    WHEN 'cbse_fa2' THEN RETURN 'FA2';
    WHEN 'cbse_sa1' THEN RETURN 'SA1';
    WHEN 'cbse_fa3' THEN RETURN 'FA3';
    WHEN 'cbse_fa4' THEN RETURN 'FA4';
    WHEN 'cbse_sa2' THEN RETURN 'SA2';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Auto-populate cbse_term and cbse_exam_type for existing CBSE exam groups
UPDATE public.exam_groups 
SET 
  cbse_term = map_cbse_exam_to_term(exam_type),
  cbse_exam_type = extract_cbse_exam_type(exam_type)
WHERE exam_type LIKE 'cbse_%' 
AND (cbse_term IS NULL OR cbse_exam_type IS NULL);

-- Grant permissions
GRANT EXECUTE ON FUNCTION map_cbse_exam_to_term(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION extract_cbse_exam_type(text) TO authenticated, anon; 