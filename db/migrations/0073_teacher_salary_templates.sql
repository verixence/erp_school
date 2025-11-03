-- Teacher Salary Templates
-- This table stores salary templates for each teacher to enable bulk payslip generation

CREATE TABLE IF NOT EXISTS public.teacher_salary_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    teacher_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

    -- Salary components
    basic_salary numeric(10, 2) NOT NULL DEFAULT 0,
    hra numeric(10, 2) DEFAULT 0,
    da numeric(10, 2) DEFAULT 0,
    ta numeric(10, 2) DEFAULT 0,
    other_allowances numeric(10, 2) DEFAULT 0,

    -- Deductions
    pf numeric(10, 2) DEFAULT 0,
    tax numeric(10, 2) DEFAULT 0,
    other_deductions numeric(10, 2) DEFAULT 0,

    -- Metadata
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- One template per teacher per school
    UNIQUE(school_id, teacher_id)
);

-- RLS Policies
ALTER TABLE public.teacher_salary_templates ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins can view all salary templates"
ON public.teacher_salary_templates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- School admins can manage their school's templates
CREATE POLICY "School admins can view their school's salary templates"
ON public.teacher_salary_templates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.school_id = teacher_salary_templates.school_id
    AND users.role = 'school_admin'
  )
);

CREATE POLICY "School admins can insert salary templates"
ON public.teacher_salary_templates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.school_id = teacher_salary_templates.school_id
    AND users.role = 'school_admin'
  )
);

CREATE POLICY "School admins can update their school's salary templates"
ON public.teacher_salary_templates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.school_id = teacher_salary_templates.school_id
    AND users.role = 'school_admin'
  )
);

CREATE POLICY "School admins can delete their school's salary templates"
ON public.teacher_salary_templates FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.school_id = teacher_salary_templates.school_id
    AND users.role = 'school_admin'
  )
);

-- View for easy querying with teacher details
CREATE OR REPLACE VIEW public.teacher_salary_template_summary AS
SELECT
    t.*,
    u.first_name || ' ' || u.last_name AS teacher_name,
    u.employee_id,
    u.email,
    (t.basic_salary + COALESCE(t.hra, 0) + COALESCE(t.da, 0) + COALESCE(t.ta, 0) + COALESCE(t.other_allowances, 0)) AS gross_salary,
    (COALESCE(t.pf, 0) + COALESCE(t.tax, 0) + COALESCE(t.other_deductions, 0)) AS total_deductions,
    (t.basic_salary + COALESCE(t.hra, 0) + COALESCE(t.da, 0) + COALESCE(t.ta, 0) + COALESCE(t.other_allowances, 0) -
     COALESCE(t.pf, 0) - COALESCE(t.tax, 0) - COALESCE(t.other_deductions, 0)) AS net_salary
FROM public.teacher_salary_templates t
JOIN public.users u ON t.teacher_id = u.id
WHERE u.role = 'teacher';

-- Indexes
CREATE INDEX idx_teacher_salary_templates_school ON public.teacher_salary_templates(school_id);
CREATE INDEX idx_teacher_salary_templates_teacher ON public.teacher_salary_templates(teacher_id);
CREATE INDEX idx_teacher_salary_templates_active ON public.teacher_salary_templates(school_id, is_active);
