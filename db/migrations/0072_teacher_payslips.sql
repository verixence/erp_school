-- Teacher Payslips Management System
-- Allows school admins to upload/generate payslips and teachers to view them

-- Create payslips table
CREATE TABLE IF NOT EXISTS public.teacher_payslips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    teacher_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

    -- Payslip details
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),

    -- Salary breakdown
    basic_salary numeric(10, 2) NOT NULL DEFAULT 0,
    allowances jsonb DEFAULT '{}', -- {hra: 5000, da: 3000, ta: 2000}
    deductions jsonb DEFAULT '{}', -- {pf: 1800, tax: 500, other: 0}
    gross_salary numeric(10, 2) NOT NULL,
    net_salary numeric(10, 2) NOT NULL,

    -- File storage
    payslip_url text, -- URL to uploaded PDF or generated payslip

    -- Status and metadata
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed')),
    sent_at timestamptz,
    viewed_at timestamptz,
    notes text,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.users(id),
    updated_at timestamptz DEFAULT now(),

    -- Ensure one payslip per teacher per month
    UNIQUE(school_id, teacher_id, month, year)
);

-- Create indexes for performance
CREATE INDEX idx_teacher_payslips_school ON public.teacher_payslips(school_id);
CREATE INDEX idx_teacher_payslips_teacher ON public.teacher_payslips(teacher_id);
CREATE INDEX idx_teacher_payslips_month_year ON public.teacher_payslips(month, year);
CREATE INDEX idx_teacher_payslips_status ON public.teacher_payslips(status);

-- Enable RLS
ALTER TABLE public.teacher_payslips ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admin can see all
CREATE POLICY "Super admin can see all payslips"
    ON public.teacher_payslips
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

-- School admin can manage payslips for their school
CREATE POLICY "School admin can manage their school payslips"
    ON public.teacher_payslips
    FOR ALL USING (
        school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'school_admin'
    );

-- Teachers can view their own payslips
CREATE POLICY "Teachers can view their own payslips"
    ON public.teacher_payslips
    FOR SELECT USING (
        teacher_id = auth.uid()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
    );

-- Teachers can update viewed_at on their own payslips
CREATE POLICY "Teachers can mark their payslips as viewed"
    ON public.teacher_payslips
    FOR UPDATE USING (
        teacher_id = auth.uid()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
    )
    WITH CHECK (
        teacher_id = auth.uid()
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_payslips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_teacher_payslips_updated_at
    BEFORE UPDATE ON public.teacher_payslips
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_payslips_updated_at();

-- Create function to mark payslip as viewed
CREATE OR REPLACE FUNCTION mark_payslip_as_viewed(payslip_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.teacher_payslips
    SET
        status = 'viewed',
        viewed_at = now()
    WHERE id = payslip_id
        AND teacher_id = auth.uid()
        AND status != 'viewed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_payslip_as_viewed(uuid) TO authenticated;

-- Create view for payslip summary
CREATE OR REPLACE VIEW public.teacher_payslip_summary AS
SELECT
    p.id,
    p.school_id,
    p.teacher_id,
    p.month,
    p.year,
    p.gross_salary,
    p.net_salary,
    p.status,
    p.sent_at,
    p.viewed_at,
    p.created_at,
    u.first_name || ' ' || u.last_name as teacher_name,
    u.employee_id,
    u.email as teacher_email,
    s.name as school_name
FROM public.teacher_payslips p
JOIN public.users u ON p.teacher_id = u.id
JOIN public.schools s ON p.school_id = s.id;

-- Grant access to view
GRANT SELECT ON public.teacher_payslip_summary TO authenticated;

-- Add comment
COMMENT ON TABLE public.teacher_payslips IS 'Stores teacher payslip records for salary management and distribution';
