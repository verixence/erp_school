-- Migration: Admission Enquiry Feature
-- Purpose: Add tables for managing admission enquiries from prospective students

-- ============================================
-- ADMISSION ENQUIRY TABLE
-- ============================================

-- Create admission_enquiries table
CREATE TABLE IF NOT EXISTS public.admission_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  
  -- Application details
  application_no TEXT NOT NULL,
  
  -- Student Information
  student_name TEXT NOT NULL,
  surname TEXT,
  date_of_birth DATE,
  age INTEGER,
  nationality TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  admission_for TEXT, -- Class/Grade applying for
  previous_institution_name TEXT,
  
  -- Parent Information - Father
  father_name TEXT,
  father_qualification TEXT,
  father_phone TEXT,
  father_organization TEXT,
  father_designation TEXT,
  
  -- Visa details for father
  father_visa_validity DATE,
  
  -- Parent Information - Mother
  mother_name TEXT,
  mother_qualification TEXT,
  mother_phone TEXT,
  mother_organization TEXT,
  mother_designation TEXT,
  
  -- Visa details for mother
  mother_visa_validity DATE,
  
  -- Address Information
  residential_address TEXT,
  area TEXT,
  pincode TEXT,
  
  -- Contact Information
  email_id TEXT,
  
  -- Additional Information
  how_did_you_know TEXT, -- How they found out about the school
  specify_if_any TEXT, -- Additional details
  
  -- Office Use
  comments TEXT,
  counselor TEXT,
  status TEXT CHECK (status IN ('open', 'in_progress', 'completed', 'rejected')) DEFAULT 'open',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Unique application number per school
  UNIQUE(school_id, application_no)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_school_id 
ON public.admission_enquiries(school_id);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_application_no 
ON public.admission_enquiries(school_id, application_no);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_student_name 
ON public.admission_enquiries(student_name);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_status 
ON public.admission_enquiries(status);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_created_at 
ON public.admission_enquiries(created_at);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_father_phone 
ON public.admission_enquiries(father_phone);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_email 
ON public.admission_enquiries(email_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on the table
ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;

-- Super admins can access all enquiries
CREATE POLICY "Admission enquiries: super admin access" 
ON public.admission_enquiries
FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- School admins can access enquiries for their school
CREATE POLICY "Admission enquiries: school admin access" 
ON public.admission_enquiries
FOR ALL USING (
  school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'school_admin'
)
WITH CHECK (
  school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'school_admin'
);

-- Teachers can view enquiries for their school (read-only)
CREATE POLICY "Admission enquiries: teacher read access" 
ON public.admission_enquiries
FOR SELECT USING (
  school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('teacher', 'school_admin')
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate unique application numbers
CREATE OR REPLACE FUNCTION generate_application_number(school_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  school_prefix TEXT;
  year_suffix TEXT;
  sequence_number INTEGER;
  application_number TEXT;
BEGIN
  -- Get school prefix (first 3 letters of school name, default to 'SCH')
  SELECT COALESCE(
    UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3)), 
    'SCH'
  ) INTO school_prefix
  FROM public.schools 
  WHERE id = school_id_param;
  
  -- Get current year suffix (last 2 digits)
  year_suffix := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
  
  -- Get next sequence number for this school and year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(
        application_no FROM '[0-9]+$'
      ) AS INTEGER
    )
  ), 0) + 1 INTO sequence_number
  FROM public.admission_enquiries 
  WHERE school_id = school_id_param 
  AND application_no LIKE school_prefix || year_suffix || '%';
  
  -- Format: SCHOOLYY-NNNN (e.g., ABC24-0001)
  application_number := school_prefix || year_suffix || '-' || LPAD(sequence_number::TEXT, 4, '0');
  
  RETURN application_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-generate application number on insert
CREATE OR REPLACE FUNCTION auto_generate_application_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate application number if not provided
  IF NEW.application_no IS NULL OR NEW.application_no = '' THEN
    NEW.application_no := generate_application_number(NEW.school_id);
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate application number
CREATE TRIGGER trigger_auto_generate_application_number
  BEFORE INSERT ON public.admission_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_application_number();

-- Trigger to update updated_at timestamp
CREATE TRIGGER trigger_update_admission_enquiry_timestamp
  BEFORE UPDATE ON public.admission_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_application_number();

-- ============================================
-- ADMISSION ENQUIRY NOTES TABLE
-- ============================================

-- Create admission_enquiry_notes table for tracking follow-ups
CREATE TABLE IF NOT EXISTS public.admission_enquiry_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES public.admission_enquiries(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT CHECK (note_type IN ('follow_up', 'meeting', 'call', 'email', 'general')) DEFAULT 'general',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for notes
CREATE INDEX IF NOT EXISTS idx_enquiry_notes_enquiry_id 
ON public.admission_enquiry_notes(enquiry_id);

CREATE INDEX IF NOT EXISTS idx_enquiry_notes_created_at 
ON public.admission_enquiry_notes(created_at);

-- Enable RLS on notes table
ALTER TABLE public.admission_enquiry_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for notes - same as main enquiry table
CREATE POLICY "Enquiry notes: super admin access" 
ON public.admission_enquiry_notes
FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "Enquiry notes: school access" 
ON public.admission_enquiry_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.admission_enquiries ae
    JOIN public.users u ON u.id = auth.uid()
    WHERE ae.id = admission_enquiry_notes.enquiry_id
    AND ae.school_id = u.school_id
    AND u.role IN ('school_admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admission_enquiries ae
    JOIN public.users u ON u.id = auth.uid()
    WHERE ae.id = admission_enquiry_notes.enquiry_id
    AND ae.school_id = u.school_id
    AND u.role IN ('school_admin', 'teacher')
  )
); 