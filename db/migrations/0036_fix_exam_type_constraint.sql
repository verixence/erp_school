-- Fix exam_type constraint to include CBSE exam types
-- This migration ensures the constraint allows CBSE exam types

-- Drop the existing constraint
ALTER TABLE public.exam_groups 
DROP CONSTRAINT IF EXISTS exam_groups_exam_type_check;

-- Add the updated constraint with CBSE exam types
ALTER TABLE public.exam_groups 
ADD CONSTRAINT exam_groups_exam_type_check 
CHECK (exam_type IN (
  'monthly', 
  'quarterly', 
  'half_yearly', 
  'annual', 
  'unit_test', 
  'other',
  'cbse_fa1', 
  'cbse_fa2', 
  'cbse_sa1', 
  'cbse_fa3', 
  'cbse_fa4', 
  'cbse_sa2'
));

-- Add CBSE-specific columns if they don't exist
ALTER TABLE public.exam_groups 
ADD COLUMN IF NOT EXISTS cbse_term text CHECK (cbse_term IN ('Term1', 'Term2')),
ADD COLUMN IF NOT EXISTS cbse_exam_type text CHECK (cbse_exam_type IN ('FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'));

-- Add indexes for CBSE queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_exam_groups_cbse_term 
ON public.exam_groups(school_id, cbse_term) 
WHERE cbse_term IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_groups_cbse_exam_type 
ON public.exam_groups(school_id, cbse_exam_type) 
WHERE cbse_exam_type IS NOT NULL; 