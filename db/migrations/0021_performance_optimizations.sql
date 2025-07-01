-- Migration: Performance Optimizations for Analytics APIs
-- Purpose: Fix 5+ second API response times by adding indexes and materialized views

-- ============================================
-- CRITICAL MISSING INDEXES
-- ============================================

-- Core table indexes for frequent JOIN operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_school_id ON public.users(school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_school_role ON public.users(school_id, role);

-- Attendance performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_school_date ON public.attendance_records(school_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);

-- Homework and academic data indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homeworks_section_due ON public.homeworks(section_id, due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_school_id ON public.sections(school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);

-- Parent-Student relationship indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);

-- Audit logs performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_school_created ON public.audit_logs(school_id, created_at DESC);

-- ============================================
-- MATERIALIZED VIEW FOR SCHOOL ANALYTICS
-- ============================================

-- Drop existing view to replace with materialized view
DROP VIEW IF EXISTS public.school_analytics;

-- Create materialized view for much faster analytics queries
CREATE MATERIALIZED VIEW public.school_analytics AS
SELECT 
    s.id as school_id,
    s.name as school_name,
    s.status,
    s.created_at,
    -- Optimized student count
    COALESCE(student_counts.total_students, 0) as total_students,
    -- Optimized user role counts
    COALESCE(user_counts.total_teachers, 0) as total_teachers,
    COALESCE(user_counts.total_parents, 0) as total_parents,
    COALESCE(user_counts.total_admins, 0) as total_admins,
    COALESCE(user_counts.total_users, 0) as total_users,
    -- Placeholder for future activity tracking
    COALESCE(user_counts.total_users, 0) as active_users_30d,
    COALESCE(user_counts.total_users, 0) as recent_users_7d,
    s.total_capacity,
    CASE 
        WHEN s.total_capacity > 0 AND student_counts.total_students > 0 
        THEN ROUND((student_counts.total_students::numeric / s.total_capacity) * 100, 2)
        ELSE 0 
    END as capacity_utilization_percent,
    -- Cache timestamp for refresh tracking
    NOW() as last_updated
FROM public.schools s
-- Optimized student count subquery
LEFT JOIN (
    SELECT 
        school_id,
        COUNT(*) as total_students
    FROM public.students 
    GROUP BY school_id
) student_counts ON student_counts.school_id = s.id
-- Optimized user count subquery  
LEFT JOIN (
    SELECT 
        school_id,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'teacher') as total_teachers,
        COUNT(*) FILTER (WHERE role = 'parent') as total_parents,
        COUNT(*) FILTER (WHERE role = 'school_admin') as total_admins
    FROM public.users 
    GROUP BY school_id
) user_counts ON user_counts.school_id = s.id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_school_analytics_id ON public.school_analytics(school_id);
CREATE INDEX idx_school_analytics_users ON public.school_analytics(total_users DESC);
CREATE INDEX idx_school_analytics_updated ON public.school_analytics(last_updated);

-- Grant access to the materialized view
GRANT SELECT ON public.school_analytics TO authenticated;

-- ============================================
-- OPTIMIZED APPLICATION STATS FUNCTION
-- ============================================

-- Replace the slow get_application_stats function with optimized version
CREATE OR REPLACE FUNCTION public.get_application_stats()
RETURNS jsonb 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE -- Mark as STABLE for better caching
AS $$
DECLARE
    result jsonb;
    school_counts record;
    user_totals record;
    type_breakdown jsonb;
    status_breakdown jsonb;
BEGIN
    -- Get basic school counts (fast query)
    SELECT 
        COUNT(*) as total_schools,
        COUNT(*) FILTER (WHERE status = 'active') as active_schools,
        COALESCE(SUM(total_capacity), 0) as total_capacity
    INTO school_counts
    FROM public.schools;
    
    -- Get aggregated user totals from materialized view (much faster)
    SELECT 
        COALESCE(SUM(total_students), 0) as total_students,
        COALESCE(SUM(total_teachers), 0) as total_teachers,
        COALESCE(SUM(total_parents), 0) as total_parents,
        COALESCE(SUM(total_users), 0) as total_users,
        COALESCE(AVG(capacity_utilization_percent), 0) as avg_capacity_utilization
    INTO user_totals
    FROM public.school_analytics;
    
    -- Get school type breakdown (separate optimized query)
    SELECT jsonb_object_agg(
        COALESCE(school_type, 'unspecified'), 
        count
    ) INTO type_breakdown
    FROM (
        SELECT 
            school_type, 
            COUNT(*) as count
        FROM public.schools
        GROUP BY school_type
    ) sub;
    
    -- Get school status breakdown (separate optimized query)
    SELECT jsonb_object_agg(status, count) INTO status_breakdown
    FROM (
        SELECT 
            status, 
            COUNT(*) as count
        FROM public.schools
        GROUP BY status
    ) sub;
    
    -- Build final result
    result := jsonb_build_object(
        'total_schools', school_counts.total_schools,
        'active_schools', school_counts.active_schools,
        'total_students', user_totals.total_students,
        'total_teachers', user_totals.total_teachers,
        'total_parents', user_totals.total_parents,
        'total_users', user_totals.total_users,
        'total_capacity', school_counts.total_capacity,
        'avg_capacity_utilization', ROUND(user_totals.avg_capacity_utilization, 2),
        'schools_by_type', COALESCE(type_breakdown, '{}'::jsonb),
        'schools_by_status', COALESCE(status_breakdown, '{}'::jsonb),
        'last_updated', extract(epoch from now())
    );
    
    RETURN result;
END;
$$;

-- ============================================
-- MATERIALIZED VIEW REFRESH FUNCTIONS
-- ============================================

-- Function to refresh school analytics (can be called manually or via cron)
CREATE OR REPLACE FUNCTION public.refresh_school_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.school_analytics;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.refresh_school_analytics() TO authenticated;

-- ============================================
-- OPTIMIZED ATTENDANCE FUNCTIONS  
-- ============================================

-- Optimize attendance stats function with better indexing strategy
CREATE OR REPLACE FUNCTION public.get_attendance_stats_optimized(
  start_date date,
  end_date date,
  school_id_param uuid
)
RETURNS TABLE (
  total_students bigint,
  total_records bigint,
  present_count bigint,
  absent_count bigint,
  late_count bigint,
  excused_count bigint,
  attendance_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH attendance_summary AS (
    SELECT 
      COUNT(*) as total_records,
      COUNT(*) FILTER (WHERE status = 'present') as present_count,
      COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
      COUNT(*) FILTER (WHERE status = 'late') as late_count,
      COUNT(*) FILTER (WHERE status = 'excused') as excused_count
    FROM public.attendance_records 
    WHERE school_id = school_id_param
      AND date BETWEEN start_date AND end_date
  ),
  student_count AS (
    SELECT COUNT(*) as total_students
    FROM public.students 
    WHERE school_id = school_id_param
  )
  SELECT 
    sc.total_students,
    COALESCE(ats.total_records, 0),
    COALESCE(ats.present_count, 0),
    COALESCE(ats.absent_count, 0), 
    COALESCE(ats.late_count, 0),
    COALESCE(ats.excused_count, 0),
    CASE 
      WHEN COALESCE(ats.total_records, 0) > 0 THEN
        ROUND(
          ((COALESCE(ats.present_count, 0) + COALESCE(ats.late_count, 0))::numeric / 
           COALESCE(ats.total_records, 1)::numeric) * 100,
          2
        )
      ELSE 0
    END as attendance_rate
  FROM student_count sc
  CROSS JOIN attendance_summary ats;
END;
$$;

-- ============================================
-- BACKGROUND REFRESH TRIGGERS
-- ============================================

-- Create function to refresh analytics on data changes
CREATE OR REPLACE FUNCTION public.trigger_analytics_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Use pg_notify to signal that refresh is needed
    -- This allows async refresh without blocking the transaction
    PERFORM pg_notify('refresh_analytics', 'school_analytics');
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on key tables to refresh analytics when data changes
-- Students table changes
CREATE TRIGGER students_analytics_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.students
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_analytics_refresh();

-- Users table changes  
CREATE TRIGGER users_analytics_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_analytics_refresh();

-- Schools table changes
CREATE TRIGGER schools_analytics_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.schools
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_analytics_refresh();

-- ============================================
-- QUERY OPTIMIZATION HINTS
-- ============================================

-- Create summary statistics table for even faster lookups
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    cache_key text PRIMARY KEY,
    data jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);

-- Cache cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_analytics_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.analytics_cache WHERE expires_at < NOW();
END;
$$;

-- ============================================
-- INITIAL DATA REFRESH
-- ============================================

-- Refresh the materialized view with current data
REFRESH MATERIALIZED VIEW public.school_analytics;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW public.school_analytics IS 'Optimized school analytics with pre-calculated aggregations for performance';
COMMENT ON FUNCTION public.get_application_stats() IS 'High-performance application statistics using materialized views';
COMMENT ON FUNCTION public.refresh_school_analytics() IS 'Refresh school analytics materialized view - call when data changes';

-- ============================================
-- PERFORMANCE ANALYSIS
-- ============================================

-- Create a view to monitor query performance
CREATE OR REPLACE VIEW public.query_performance_monitor AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('schools', 'students', 'users', 'attendance_records')
ORDER BY tablename, attname;

GRANT SELECT ON public.query_performance_monitor TO authenticated; 