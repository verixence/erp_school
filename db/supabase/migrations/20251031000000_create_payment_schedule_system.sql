-- Payment Schedule System for Fee Reminders
-- This replaces the confusing "fee demand" terminology for collection schedules

-- 1. Notifications table (for in-app notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'fee_reminder', -- fee_reminder, announcement, alert, etc.
  related_entity_type VARCHAR(50), -- 'payment_schedule', 'student', 'fee_structure', etc.
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Auto-delete after expiry
  metadata JSONB -- Extra data like amount, due_date, etc.
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- 2. Push notification queue (for mobile push notifications)
CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tokens TEXT[] NOT NULL, -- Array of Expo push tokens
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional data to send with notification
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, sent, failed
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_attempt_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_notification_queue(status, attempts, created_at);

-- 3. Fee collection schedules (when to collect fees)
CREATE TABLE IF NOT EXISTS fee_collection_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  schedule_name VARCHAR(100) NOT NULL, -- "Term 1 Payment 2025", "April 2025 Fees"
  description TEXT,
  academic_year VARCHAR(20) NOT NULL,
  due_date DATE NOT NULL,
  grace_period_days INT DEFAULT 0,
  late_fee_applicable BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_school ON fee_collection_schedules(school_id, status, due_date);

-- 4. Which grades are included in each schedule
CREATE TABLE IF NOT EXISTS fee_schedule_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  grade VARCHAR(50) NOT NULL, -- Supports "NURSERY", "LKG", "1", "2", etc.
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schedule_id, grade)
);

CREATE INDEX IF NOT EXISTS idx_schedule_grades ON fee_schedule_grades(schedule_id);

-- 5. Which fee categories/types are being collected
CREATE TABLE IF NOT EXISTS fee_schedule_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  fee_category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount_override DECIMAL(10,2), -- NULL means use fee structure amount
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schedule_id, fee_category_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_items ON fee_schedule_items(schedule_id);

-- 6. Reminder configurations
CREATE TABLE IF NOT EXISTS fee_schedule_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL, -- 'before_due', 'on_due', 'after_due'
  days_before INT NOT NULL, -- 7 for "7 days before", 0 for "on due date", -3 for "3 days after"
  notification_channels TEXT[] DEFAULT ARRAY['in_app', 'push'], -- in_app, push (no sms/email)
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_reminders ON fee_schedule_reminders(schedule_id, is_active);

-- 7. Track sent notifications to avoid duplicates
CREATE TABLE IF NOT EXISTS reminder_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID NOT NULL REFERENCES fee_schedule_reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Parent user ID
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT NOW(),
  channels TEXT[] NOT NULL, -- Which channels were used
  status VARCHAR(20) DEFAULT 'sent', -- sent, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder ON reminder_logs(reminder_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user ON reminder_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_schedule ON reminder_logs(schedule_id, student_id, sent_at DESC);

-- 8. Function to get students who haven't paid for a schedule
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
    s.grade,
    s.section,
    s.parent_id AS parent_user_id,
    u.email AS parent_email,
    u.expo_push_token,
    COALESCE(
      (
        SELECT SUM(
          COALESCE(
            fsi.amount_override,
            (
              SELECT fs.amount
              FROM fee_structures fs
              WHERE fs.fee_category_id = fsi.fee_category_id
                AND fs.grade = s.grade
                AND fs.school_id = fcs.school_id
                AND fs.academic_year = fcs.academic_year
                AND fs.is_active = true
              LIMIT 1
            )
          )
        )
        FROM fee_schedule_items fsi
        WHERE fsi.schedule_id = p_schedule_id
      ),
      0
    ) AS total_amount_due
  FROM fee_collection_schedules fcs
  INNER JOIN fee_schedule_grades fsg ON fsg.schedule_id = fcs.id
  INNER JOIN students s ON s.grade = fsg.grade OR s.grade_text = fsg.grade
  LEFT JOIN users u ON u.id = s.parent_id
  WHERE fcs.id = p_schedule_id
    AND fcs.status = 'active'
    AND s.status = 'active'
    AND s.school_id = fcs.school_id
    -- TODO: Add payment status check once payment tracking is implemented
    -- AND NOT EXISTS (
    --   SELECT 1 FROM fee_payments fp
    --   WHERE fp.student_id = s.id
    --     AND fp.schedule_id = fcs.id
    --     AND fp.status = 'completed'
    -- )
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to check if reminder should be sent today
CREATE OR REPLACE FUNCTION should_send_reminder_today(
  p_due_date DATE,
  p_days_before INT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (p_due_date - p_days_before) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Function to get reminders that need to be sent today
CREATE OR REPLACE FUNCTION get_reminders_due_today()
RETURNS TABLE (
  reminder_id UUID,
  schedule_id UUID,
  schedule_name VARCHAR(100),
  due_date DATE,
  reminder_type VARCHAR(20),
  days_before INT,
  notification_channels TEXT[],
  message_template TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fsr.id AS reminder_id,
    fcs.id AS schedule_id,
    fcs.schedule_name,
    fcs.due_date,
    fsr.reminder_type,
    fsr.days_before,
    fsr.notification_channels,
    fsr.message_template
  FROM fee_schedule_reminders fsr
  INNER JOIN fee_collection_schedules fcs ON fcs.id = fsr.schedule_id
  WHERE fsr.is_active = true
    AND fcs.status = 'active'
    AND should_send_reminder_today(fcs.due_date, fsr.days_before)
  ORDER BY fcs.due_date, fsr.days_before DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Add expo_push_token column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'expo_push_token'
  ) THEN
    ALTER TABLE users ADD COLUMN expo_push_token TEXT;
    CREATE INDEX idx_users_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;
  END IF;
END $$;

-- 12. Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_collection_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedule_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedule_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for push notification queue (admin only)
CREATE POLICY "Only admins can manage push queue"
  ON push_notification_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'school_admin')
    )
  );

-- RLS Policies for fee collection schedules
CREATE POLICY "School admins can manage schedules"
  ON fee_collection_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.school_id = fee_collection_schedules.school_id
        AND users.role IN ('super_admin', 'school_admin')
    )
  );

CREATE POLICY "Parents and students can view schedules"
  ON fee_collection_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.school_id = fee_collection_schedules.school_id
        AND users.role IN ('parent', 'student')
    )
  );

-- Similar RLS policies for related tables
CREATE POLICY "School admins can manage schedule grades"
  ON fee_schedule_grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fee_collection_schedules fcs
      INNER JOIN users u ON u.school_id = fcs.school_id
      WHERE fcs.id = fee_schedule_grades.schedule_id
        AND u.id = auth.uid()
        AND u.role IN ('super_admin', 'school_admin')
    )
  );

CREATE POLICY "School admins can manage schedule items"
  ON fee_schedule_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fee_collection_schedules fcs
      INNER JOIN users u ON u.school_id = fcs.school_id
      WHERE fcs.id = fee_schedule_items.schedule_id
        AND u.id = auth.uid()
        AND u.role IN ('super_admin', 'school_admin')
    )
  );

CREATE POLICY "School admins can manage reminders"
  ON fee_schedule_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fee_collection_schedules fcs
      INNER JOIN users u ON u.school_id = fcs.school_id
      WHERE fcs.id = fee_schedule_reminders.schedule_id
        AND u.id = auth.uid()
        AND u.role IN ('super_admin', 'school_admin')
    )
  );

CREATE POLICY "Users can view their reminder logs"
  ON reminder_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_unpaid_students_for_schedule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_reminder_today(DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reminders_due_today() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE fee_collection_schedules IS 'Payment schedules define when fees should be collected from students';
COMMENT ON TABLE fee_schedule_reminders IS 'Configures automatic reminders for payment schedules (in-app and push only, no SMS/email)';
COMMENT ON TABLE notifications IS 'In-app notifications for web and mobile';
COMMENT ON TABLE push_notification_queue IS 'Queue for mobile push notifications via Expo';
COMMENT ON FUNCTION get_unpaid_students_for_schedule IS 'Returns students who haven''t paid for a specific schedule';
COMMENT ON FUNCTION get_reminders_due_today IS 'Returns reminders that need to be processed today';
