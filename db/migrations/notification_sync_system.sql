-- ============================================================================
-- NOTIFICATION SYNC SYSTEM
-- Auto-sync web notifications to mobile push notifications
-- ============================================================================

-- Step 1: Create helper function to get users by audience
-- ============================================================================
CREATE OR REPLACE FUNCTION get_users_by_audience(
  p_school_id UUID,
  p_audience TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.role
  FROM users u
  WHERE u.school_id = p_school_id
    AND u.is_active = TRUE
    AND (
      p_audience = 'all'
      OR (p_audience = 'teachers' AND u.role = 'teacher')
      OR (p_audience = 'parents' AND u.role = 'parent')
      OR (p_audience = 'students' AND u.role = 'student')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create function to queue push notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_tokens TEXT[];
  v_token_count INT;
BEGIN
  -- Get active push tokens for the user
  SELECT ARRAY_AGG(token)
  INTO v_tokens
  FROM push_tokens
  WHERE user_id = NEW.user_id
    AND is_active = TRUE;

  -- Get count of tokens
  v_token_count := COALESCE(array_length(v_tokens, 1), 0);

  -- Only queue if there are active tokens
  IF v_token_count > 0 THEN
    -- Insert into push notification queue
    INSERT INTO push_notification_queue (
      tokens,
      title,
      body,
      data,
      status,
      attempts,
      created_at
    ) VALUES (
      v_tokens,
      NEW.title,
      NEW.message,
      jsonb_build_object(
        'notification_id', NEW.id::text,
        'type', NEW.type,
        'related_id', COALESCE(NEW.related_id, ''),
        'screen', CASE
          WHEN NEW.type = 'announcement' THEN 'Announcements'
          WHEN NEW.type = 'homework' THEN 'Homework'
          WHEN NEW.type = 'exam' THEN 'Exams'
          WHEN NEW.type = 'post' THEN 'Community'
          ELSE 'Dashboard'
        END
      ),
      'pending',
      0,
      NOW()
    );

    -- Log for debugging
    RAISE NOTICE 'Queued push notification for user % with % tokens', NEW.user_id, v_token_count;
  ELSE
    RAISE NOTICE 'No active push tokens for user %, skipping push notification', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on notifications table
-- ============================================================================
DROP TRIGGER IF EXISTS on_notification_created ON notifications;

CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

-- Step 4: Create function for bulk notifications with push
-- ============================================================================
CREATE OR REPLACE FUNCTION create_bulk_notifications_with_push(
  p_school_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_target_audience TEXT,
  p_related_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  notifications_created INT,
  push_notifications_queued INT
) AS $$
DECLARE
  v_user_ids UUID[];
  v_notifications_inserted INT;
  v_push_queued INT := 0;
  v_user_id UUID;
  v_tokens TEXT[];
BEGIN
  -- Get target user IDs
  SELECT ARRAY_AGG(u.id)
  INTO v_user_ids
  FROM get_users_by_audience(p_school_id, p_target_audience) u;

  -- Return early if no users found
  IF v_user_ids IS NULL OR array_length(v_user_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  -- Create in-app notifications for all users
  INSERT INTO notifications (
    school_id,
    user_id,
    title,
    message,
    type,
    related_id,
    is_read,
    created_at
  )
  SELECT
    p_school_id,
    user_id,
    p_title,
    p_message,
    p_type::TEXT,
    p_related_id,
    FALSE,
    NOW()
  FROM UNNEST(v_user_ids) AS user_id;

  GET DIAGNOSTICS v_notifications_inserted = ROW_COUNT;

  -- The trigger will automatically queue push notifications
  -- But we'll return the count for monitoring
  SELECT COUNT(*)
  INTO v_push_queued
  FROM push_notification_queue
  WHERE created_at >= NOW() - INTERVAL '5 seconds';

  RETURN QUERY SELECT v_notifications_inserted, v_push_queued;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to send immediate push to specific users
-- ============================================================================
CREATE OR REPLACE FUNCTION send_push_to_users(
  p_user_ids UUID[],
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS INT AS $$
DECLARE
  v_all_tokens TEXT[];
  v_queued_count INT := 0;
BEGIN
  -- Collect all active tokens for the users
  SELECT ARRAY_AGG(token)
  INTO v_all_tokens
  FROM push_tokens
  WHERE user_id = ANY(p_user_ids)
    AND is_active = TRUE;

  -- Only queue if there are tokens
  IF v_all_tokens IS NOT NULL AND array_length(v_all_tokens, 1) > 0 THEN
    INSERT INTO push_notification_queue (
      tokens,
      title,
      body,
      data,
      status,
      attempts,
      created_at
    ) VALUES (
      v_all_tokens,
      p_title,
      p_body,
      p_data,
      'pending',
      0,
      NOW()
    );

    v_queued_count := array_length(v_all_tokens, 1);
  END IF;

  RETURN v_queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active
  ON push_tokens(user_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_push_queue_status_created
  ON push_notification_queue(status, created_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at) WHERE is_read = FALSE;

-- Step 7: Grant necessary permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_users_by_audience TO authenticated;
GRANT EXECUTE ON FUNCTION create_bulk_notifications_with_push TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_to_users TO authenticated;

-- Step 8: Create view for monitoring
-- ============================================================================
CREATE OR REPLACE VIEW notification_queue_stats AS
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  AVG(attempts) as avg_attempts
FROM push_notification_queue
GROUP BY status;

GRANT SELECT ON notification_queue_stats TO authenticated;

-- ============================================================================
-- INSTALLATION COMPLETE
-- ============================================================================

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ Notification sync system installed successfully!';
  RAISE NOTICE '📋 Created functions:';
  RAISE NOTICE '   - get_users_by_audience()';
  RAISE NOTICE '   - queue_push_notification()';
  RAISE NOTICE '   - create_bulk_notifications_with_push()';
  RAISE NOTICE '   - send_push_to_users()';
  RAISE NOTICE '🔔 Created trigger: on_notification_created';
  RAISE NOTICE '📊 Created view: notification_queue_stats';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Update common package with new functions';
  RAISE NOTICE '   2. Update web app to use bulk notifications';
  RAISE NOTICE '   3. Test with a real announcement';
END $$;
