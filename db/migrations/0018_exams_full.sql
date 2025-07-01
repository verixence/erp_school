-- Enhanced Exams and Report Templates
-- Migration 0018_exams_full.sql

-- Add room_no to exam_papers
ALTER TABLE public.exam_papers 
  ADD COLUMN IF NOT EXISTS room_no TEXT;

-- Add published flag to exam_groups (if not already exists)
ALTER TABLE public.exam_groups 
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;

-- Report Templates table
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools ON DELETE CASCADE,
  name TEXT NOT NULL,
  json JSONB NOT NULL DEFAULT '{}', -- header/footer coords, font sizes, show_logo bool
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add report card generation tracking
CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_group_id UUID REFERENCES public.exam_groups ON DELETE CASCADE,
  student_id UUID REFERENCES public.users ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections ON DELETE CASCADE,
  template_id UUID REFERENCES public.report_templates ON DELETE SET NULL,
  pdf_path TEXT, -- Storage path for generated PDF
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'distributed')),
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add exam scheduling conflicts table
CREATE TABLE IF NOT EXISTS public.exam_schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id UUID REFERENCES public.exam_papers ON DELETE CASCADE,
  conflict_type TEXT NOT NULL, -- 'teacher', 'room', 'student_section'
  conflict_description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_templates_school_id ON public.report_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_exam_group_id ON public.report_cards(exam_group_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON public.report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_conflicts_exam_paper_id ON public.exam_schedule_conflicts(exam_paper_id);

-- RLS Policies for report_templates
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates for their school" ON public.report_templates
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.school_id = report_templates.school_id
  )
);

CREATE POLICY "School admins can manage report templates" ON public.report_templates
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.school_id = report_templates.school_id 
    AND u.role = 'school_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.school_id = report_templates.school_id 
    AND u.role = 'school_admin'
  )
);

-- RLS Policies for report_cards
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report cards for their school" ON public.report_cards
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.exam_groups eg ON eg.school_id = u.school_id
    WHERE u.id = auth.uid() AND eg.id = report_cards.exam_group_id
  ) OR
  -- Students can see their own report cards
  (student_id = auth.uid()) OR
  -- Parents can see their children's report cards
  EXISTS (
    SELECT 1 FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid() AND ps.student_id = report_cards.student_id
  )
);

CREATE POLICY "School admins can manage report cards" ON public.report_cards
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.exam_groups eg ON eg.school_id = u.school_id
    WHERE u.id = auth.uid() AND u.role = 'school_admin' AND eg.id = report_cards.exam_group_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.exam_groups eg ON eg.school_id = u.school_id
    WHERE u.id = auth.uid() AND u.role = 'school_admin' AND eg.id = report_cards.exam_group_id
  )
);

-- RLS Policies for exam_schedule_conflicts
ALTER TABLE public.exam_schedule_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conflicts for their school exams" ON public.exam_schedule_conflicts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_papers ep
    JOIN public.exam_groups eg ON eg.id = ep.exam_group_id
    JOIN public.users u ON u.school_id = eg.school_id
    WHERE u.id = auth.uid() AND ep.id = exam_schedule_conflicts.exam_paper_id
  )
);

CREATE POLICY "School admins can manage exam conflicts" ON public.exam_schedule_conflicts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_papers ep
    JOIN public.exam_groups eg ON eg.id = ep.exam_group_id
    JOIN public.users u ON u.school_id = eg.school_id
    WHERE u.id = auth.uid() AND u.role = 'school_admin' AND ep.id = exam_schedule_conflicts.exam_paper_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_papers ep
    JOIN public.exam_groups eg ON eg.id = ep.exam_group_id
    JOIN public.users u ON u.school_id = eg.school_id
    WHERE u.id = auth.uid() AND u.role = 'school_admin' AND ep.id = exam_schedule_conflicts.exam_paper_id
  )
);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_templates_updated_at();

CREATE OR REPLACE FUNCTION update_report_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_cards_updated_at
  BEFORE UPDATE ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_report_cards_updated_at();

-- Insert default report template for each school
INSERT INTO public.report_templates (school_id, name, json, is_default)
SELECT 
  s.id,
  'Standard Report Card',
  '{
    "header": {
      "showLogo": true,
      "fontSize": 16,
      "schoolNameSize": 24,
      "addressSize": 12
    },
    "studentInfo": {
      "fontSize": 12,
      "showPhoto": true,
      "layout": "horizontal"
    },
    "gradesTable": {
      "fontSize": 10,
      "showRank": true,
      "showPercentage": true,
      "colorGrades": true
    },
    "footer": {
      "fontSize": 10,
      "showSignatures": true,
      "principalSignature": true,
      "classTeacherSignature": true
    }
  }'::jsonb,
  true
FROM public.schools s
ON CONFLICT DO NOTHING; 