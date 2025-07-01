-- Performance Monitoring Queries for ERP School Analytics
-- Run these queries to monitor performance improvements

-- 1. Check materialized view refresh status
SELECT 
    schemaname,
    matviewname,
    matviewowner,
    tablespace,
    hasindexes,
    ispopulated,
    definition
FROM pg_matviews 
WHERE matviewname = 'school_analytics';

-- 2. Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('students', 'users', 'schools', 'attendance_records')
ORDER BY idx_scan DESC;

-- 3. Table scan statistics (lower seq_scan is better after indexes)
SELECT 
    schemaname,
    relname as tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
    AND relname IN ('students', 'users', 'schools', 'attendance_records', 'school_analytics')
ORDER BY seq_scan DESC;

-- 4. Query performance for specific functions
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM get_application_stats();

-- 5. Materialized view size and row count
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    most_common_vals,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename = 'school_analytics';

-- 6. Check for missing indexes (queries that might benefit from indexes)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    seq_tup_read / seq_scan as avg_tup_read
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
    AND seq_scan > 0
    AND seq_tup_read / seq_scan > 100  -- Tables with high average reads per scan
ORDER BY seq_tup_read DESC;

-- 7. Function call statistics
SELECT 
    schemaname,
    funcname,
    calls,
    total_time,
    mean_time,
    stddev_time
FROM pg_stat_user_functions 
WHERE schemaname = 'public'
    AND funcname IN ('get_application_stats', 'get_attendance_stats', 'get_attendance_stats_optimized')
ORDER BY mean_time DESC;

-- 8. Cache hit ratio (should be > 95% for good performance)
SELECT 
    'Buffer Cache Hit Ratio' as metric,
    ROUND(
        (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
    ) as percentage
FROM pg_statio_user_tables
WHERE heap_blks_read > 0;

-- 9. Manual refresh materialized view (run when needed)
-- SELECT refresh_school_analytics();

-- 10. Performance comparison query (run before and after optimizations)
\timing on
SELECT 
    'Application Stats Performance Test' as test_name,
    clock_timestamp() as start_time;
    
SELECT * FROM get_application_stats();

SELECT 
    'School Analytics Performance Test' as test_name,
    clock_timestamp() as start_time;
    
SELECT COUNT(*) FROM school_analytics;

SELECT 
    'Top Schools Performance Test' as test_name,
    clock_timestamp() as start_time;
    
SELECT school_name, total_users 
FROM school_analytics 
ORDER BY total_users DESC 
LIMIT 5;

\timing off

-- 11. Cleanup old analytics cache (run periodically)
-- SELECT cleanup_analytics_cache();

-- 12. Check for table bloat
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_tup_upd + n_tup_del DESC; 