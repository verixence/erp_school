-- Fix notification system for payment schedule reminders
-- This migration fixes issues preventing fee reminders from being sent

-- 1. Add 'fee_reminder' to allowed notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY['announcement'::text, 'post'::text, 'system'::text, 'exam'::text, 'homework'::text, 'report'::text, 'comment'::text, 'reaction'::text, 'fee_reminder'::text]));

-- 2. Fix get_unpaid_students_for_schedule to use student_parents table
CREATE OR REPLACE FUNCTION get_unpaid_students_for_schedule(p_schedule_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  grade VARCHAR(50),
  section VARCHAR(10),
  parent_user_id UUID,
  parent_email VARCHAR(255),
  expo_push_token TEXT,
  total_amount_due DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id AS student_id,
    s.full_name AS student_name,
    s.grade::VARCHAR(50) AS grade,
    s.section::VARCHAR(10),
    sp.parent_id AS parent_user_id,
    u.email::VARCHAR(255) AS parent_email,
    ppt.push_token AS expo_push_token,
    COALESCE(
      (SELECT SUM(COALESCE(fsi.amount_override, fs.amount::DECIMAL))
       FROM fee_schedule_items fsi
       JOIN fee_structures fs ON fs.fee_category_id = fsi.fee_category_id
       WHERE fsi.schedule_id = p_schedule_id
         AND LOWER(fs.grade) = LOWER(s.grade)
         AND fs.school_id = s.school_id
      ), 0
    )::DECIMAL(10,2) AS total_amount_due
  FROM fee_collection_schedules fcs
  INNER JOIN fee_schedule_grades fsg ON fsg.schedule_id = fcs.id
  INNER JOIN students s ON LOWER(s.grade) = LOWER(fsg.grade)
  INNER JOIN student_parents sp ON sp.student_id = s.id
  LEFT JOIN users u ON u.id = sp.parent_id
  LEFT JOIN parent_push_tokens ppt ON ppt.parent_id = sp.parent_id
  WHERE fcs.id = p_schedule_id
    AND fcs.status = 'active'
    AND s.status = 'active'
    AND s.school_id = fcs.school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update process_fee_reminders_daily to match notifications table structure
CREATE OR REPLACE FUNCTION process_fee_reminders_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reminder RECORD;
  v_student RECORD;
  v_title TEXT;
  v_message TEXT;
  v_channels TEXT[];
  v_sent_channels TEXT[];
BEGIN
  RAISE NOTICE 'Starting fee reminder processing at %', NOW();

  -- Get all reminders due today
  FOR v_reminder IN
    SELECT * FROM get_reminders_due_today()
  LOOP
    RAISE NOTICE 'Processing reminder % for schedule %', v_reminder.reminder_id, v_reminder.schedule_name;

    -- Get unpaid students for this schedule
    FOR v_student IN
      SELECT * FROM get_unpaid_students_for_schedule(v_reminder.schedule_id)
    LOOP
      -- Check if reminder was already sent in last 24 hours
      IF EXISTS (
        SELECT 1 FROM reminder_logs
        WHERE reminder_id = v_reminder.reminder_id
          AND student_id = v_student.student_id
          AND sent_at > NOW() - INTERVAL '24 hours'
      ) THEN
        CONTINUE; -- Skip, already sent
      END IF;

      -- Skip if no parent user
      IF v_student.parent_user_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Prepare message
      v_title := 'Fee Payment Reminder';
      v_message := COALESCE(
        v_reminder.message_template,
        v_reminder.schedule_name || ' for ' || v_student.student_name ||
        ' is due on ' || TO_CHAR(v_reminder.due_date, 'DD Mon YYYY') ||
        '. Amount: ₹' || COALESCE(v_student.total_amount_due::TEXT, '0.00')
      );

      -- Replace template variables
      v_message := REPLACE(v_message, '{schedule_name}', v_reminder.schedule_name);
      v_message := REPLACE(v_message, '{student_name}', v_student.student_name);
      v_message := REPLACE(v_message, '{due_date}', TO_CHAR(v_reminder.due_date, 'DD Mon YYYY'));
      v_message := REPLACE(v_message, '{amount}', COALESCE(v_student.total_amount_due::TEXT, '0.00'));

      v_channels := v_reminder.notification_channels;
      v_sent_channels := ARRAY[]::TEXT[];

      -- Send in-app notification (using actual table structure)
      IF 'in_app' = ANY(v_channels) THEN
        BEGIN
          -- Get school_id from the schedule
          INSERT INTO notifications (
            school_id,
            user_id,
            title,
            message,
            type,
            related_id,
            expires_at
          )
          SELECT
            fcs.school_id,
            v_student.parent_user_id,
            v_title,
            v_message,
            'fee_reminder',
            v_reminder.schedule_id,
            NOW() + INTERVAL '30 days'
          FROM fee_collection_schedules fcs
          WHERE fcs.id = v_reminder.schedule_id;

          v_sent_channels := array_append(v_sent_channels, 'in_app');
          RAISE NOTICE 'In-app notification created for parent %', v_student.parent_email;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error sending in-app notification: %', SQLERRM;
        END;
      END IF;

      -- Queue push notification
      IF 'push' = ANY(v_channels) AND v_student.expo_push_token IS NOT NULL THEN
        BEGIN
          INSERT INTO push_notification_queue (
            tokens,
            title,
            body,
            data,
            status
          ) VALUES (
            ARRAY[v_student.expo_push_token],
            v_title,
            v_message,
            jsonb_build_object(
              'type', 'fee_reminder',
              'schedule_id', v_reminder.schedule_id,
              'student_id', v_student.student_id,
              'screen', 'Fees'
            ),
            'pending'
          );
          v_sent_channels := array_append(v_sent_channels, 'push');
          RAISE NOTICE 'Push notification queued for parent %', v_student.parent_email;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error queuing push notification: %', SQLERRM;
        END;
      END IF;

      -- Log the reminder
      IF array_length(v_sent_channels, 1) > 0 THEN
        INSERT INTO reminder_logs (
          reminder_id,
          user_id,
          student_id,
          schedule_id,
          channels,
          status
        ) VALUES (
          v_reminder.reminder_id,
          v_student.parent_user_id,
          v_student.student_id,
          v_reminder.schedule_id,
          v_sent_channels,
          'sent'
        );
        RAISE NOTICE 'Reminder logged for student %', v_student.student_name;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Completed fee reminder processing at %', NOW();
END;
$$;

-- Comment
COMMENT ON FUNCTION get_unpaid_students_for_schedule IS 'Returns students who have unpaid fees for a payment schedule, using student_parents table for parent relationships';
COMMENT ON FUNCTION process_fee_reminders_daily IS 'Processes fee payment reminders daily, sending in-app and push notifications to parents';
