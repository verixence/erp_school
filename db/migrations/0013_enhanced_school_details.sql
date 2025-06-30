-- Enhanced School Details Migration
-- Add additional fields to schools table for comprehensive school information

-- Add new columns to schools table
ALTER TABLE public.schools 
ADD COLUMN logo_url text,
ADD COLUMN website_url text,
ADD COLUMN email_address text,
ADD COLUMN phone_number text,
ADD COLUMN address jsonb default '{}',
ADD COLUMN principal_name text,
ADD COLUMN principal_email text,
ADD COLUMN principal_phone text,
ADD COLUMN theme_colors jsonb default '{}',
ADD COLUMN school_type text default 'public',
ADD COLUMN board_affiliation text,
ADD COLUMN establishment_year integer,
ADD COLUMN total_capacity integer,
ADD COLUMN description text,
ADD COLUMN settings jsonb default '{}',
ADD COLUMN updated_at timestamptz default now();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at 
    BEFORE UPDATE ON public.schools 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Create school admins table for multiple admin management
CREATE TABLE public.school_admins (
    id uuid primary key default gen_random_uuid(),
    school_id uuid references public.schools on delete cascade not null,
    user_id uuid references public.users on delete cascade not null,
    role text default 'admin' check (role in ('admin', 'super_admin')),
    permissions jsonb default '{}',
    is_primary boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    UNIQUE(school_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_school_admins_school_id ON public.school_admins(school_id);
CREATE INDEX idx_school_admins_user_id ON public.school_admins(user_id);
CREATE INDEX idx_schools_email ON public.schools(email_address);
CREATE INDEX idx_schools_principal_email ON public.schools(principal_email);

-- Enable RLS for school_admins
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_admins
CREATE POLICY "School admins: super admin can see all"
    ON public.school_admins
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "School admins: school admin can see same school"
    ON public.school_admins
    FOR SELECT USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
        OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
    );

-- Create analytics view for school insights
CREATE OR REPLACE VIEW public.school_analytics AS
SELECT 
    s.id as school_id,
    s.name as school_name,
    s.status,
    s.created_at,
    COUNT(DISTINCT st.id) as total_students,
    COUNT(DISTINCT CASE WHEN u.role = 'teacher' THEN u.id END) as total_teachers,
    COUNT(DISTINCT CASE WHEN u.role = 'parent' THEN u.id END) as total_parents,
    COUNT(DISTINCT CASE WHEN u.role = 'school_admin' THEN u.id END) as total_admins,
    COUNT(DISTINCT u.id) as total_users,
    -- Active users in last 30 days (placeholder for when we track login activity)
    COUNT(DISTINCT u.id) as active_users_30d,
    -- Recent users in last 7 days (placeholder)
    COUNT(DISTINCT u.id) as recent_users_7d,
    s.total_capacity,
    CASE 
        WHEN s.total_capacity > 0 THEN ROUND((COUNT(DISTINCT st.id)::numeric / s.total_capacity) * 100, 2)
        ELSE 0 
    END as capacity_utilization_percent
FROM public.schools s
LEFT JOIN public.students st ON st.school_id = s.id
LEFT JOIN public.users u ON u.school_id = s.id
GROUP BY s.id, s.name, s.status, s.created_at, s.total_capacity;

-- Grant access to the view
GRANT SELECT ON public.school_analytics TO authenticated;

-- RLS for school_analytics view
CREATE POLICY "School analytics: super admin can see all"
    ON public.school_analytics
    FOR SELECT USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "School analytics: school admin can see own school"
    ON public.school_analytics
    FOR SELECT USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
        OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
    );

-- Update existing schools with default values
UPDATE public.schools 
SET 
    address = '{"street": "", "city": "", "state": "", "country": "", "postal_code": ""}',
    theme_colors = '{"primary": "#2563eb", "secondary": "#64748b", "accent": "#0ea5e9"}',
    settings = '{"timezone": "UTC", "academic_year_start": "April", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}'
WHERE address IS NULL OR theme_colors IS NULL OR settings IS NULL;

-- Create function to get overall application statistics
CREATE OR REPLACE FUNCTION public.get_application_stats()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_schools', COUNT(DISTINCT s.id),
        'active_schools', COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END),
        'total_students', COALESCE(SUM(sa.total_students), 0),
        'total_teachers', COALESCE(SUM(sa.total_teachers), 0),
        'total_parents', COALESCE(SUM(sa.total_parents), 0),
        'total_users', COALESCE(SUM(sa.total_users), 0),
        'total_capacity', COALESCE(SUM(s.total_capacity), 0),
        'avg_capacity_utilization', COALESCE(AVG(sa.capacity_utilization_percent), 0),
        'schools_by_type', (
            SELECT jsonb_object_agg(school_type, count)
            FROM (
                SELECT school_type, COUNT(*) as count
                FROM public.schools
                WHERE school_type IS NOT NULL
                GROUP BY school_type
            ) sub
        ),
        'schools_by_status', (
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM public.schools
                GROUP BY status
            ) sub
        )
    ) INTO result
    FROM public.schools s
    LEFT JOIN public.school_analytics sa ON sa.school_id = s.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_application_stats() TO authenticated; 