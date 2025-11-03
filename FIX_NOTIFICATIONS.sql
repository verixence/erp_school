-- ========================================
-- FIX: Add 'event' to notification types
-- Run this in Supabase SQL Editor
-- ========================================

-- Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with 'event' type included
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'announcement'::text,
  'post'::text,
  'system'::text,
  'exam'::text,
  'homework'::text,
  'report'::text,
  'comment'::text,
  'reaction'::text,
  'fee_reminder'::text,
  'event'::text
]));

-- Verify the fix
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_type_check';

-- Test by selecting allowed types
SELECT 'Constraint updated successfully! Event notifications are now enabled.' AS status;
