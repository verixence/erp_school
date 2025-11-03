-- Migration 0071: Add 'event' notification type for calendar events
-- Created: 2025-11-02

-- Add 'event' to allowed notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
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

-- Add index on event type for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_type_event ON notifications(type) WHERE type = 'event';

-- Comment
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Allowed notification types including calendar events';
