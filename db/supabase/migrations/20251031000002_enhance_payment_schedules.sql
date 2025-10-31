-- Enhanced Payment Schedule System
-- Adds: Custom amounts, installments, late fees, payment tracking, custom messages

-- ============================================
-- 1. CUSTOM AMOUNT OVERRIDES
-- ============================================
-- Already exists in fee_schedule_items.amount_override
-- Just add a comment for clarity
COMMENT ON COLUMN fee_schedule_items.amount_override IS 'Custom amount override for this fee type in this schedule. If null, uses fee_structures.amount';

-- ============================================
-- 2. INSTALLMENT PLANS
-- ============================================

-- Add installment support to schedules
ALTER TABLE fee_collection_schedules
ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1 CHECK (installment_count >= 1 AND installment_count <= 12),
ADD COLUMN IF NOT EXISTS installment_frequency VARCHAR(20) CHECK (installment_frequency IN ('monthly', 'quarterly', 'custom'));

-- Create installments table
CREATE TABLE IF NOT EXISTS fee_schedule_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  installment_name VARCHAR(100) NOT NULL,
  due_date DATE NOT NULL,
  percentage DECIMAL(5,2) CHECK (percentage > 0 AND percentage <= 100), -- Percentage of total
  fixed_amount DECIMAL(10,2) CHECK (fixed_amount >= 0), -- Or fixed amount
  grace_period_days INTEGER DEFAULT 0 CHECK (grace_period_days >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schedule_id, installment_number),
  CHECK ((percentage IS NOT NULL AND fixed_amount IS NULL) OR (percentage IS NULL AND fixed_amount IS NOT NULL))
);

CREATE INDEX idx_installments_schedule ON fee_schedule_installments(schedule_id);

COMMENT ON TABLE fee_schedule_installments IS 'Installment breakdown for payment schedules';
COMMENT ON COLUMN fee_schedule_installments.percentage IS 'Percentage of total fee amount for this installment';
COMMENT ON COLUMN fee_schedule_installments.fixed_amount IS 'Fixed amount for this installment (alternative to percentage)';

-- ============================================
-- 3. LATE FEE PENALTIES
-- ============================================

-- Add late fee configuration to schedules
ALTER TABLE fee_collection_schedules
ADD COLUMN IF NOT EXISTS late_fee_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_fee_type VARCHAR(20) CHECK (late_fee_type IN ('fixed', 'percentage', 'daily')),
ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(10,2) CHECK (late_fee_amount >= 0),
ADD COLUMN IF NOT EXISTS late_fee_percentage DECIMAL(5,2) CHECK (late_fee_percentage >= 0 AND late_fee_percentage <= 100),
ADD COLUMN IF NOT EXISTS late_fee_max_amount DECIMAL(10,2) CHECK (late_fee_max_amount >= 0);

COMMENT ON COLUMN fee_collection_schedules.late_fee_type IS 'fixed: one-time fee, percentage: % of due amount, daily: per day after grace period';
COMMENT ON COLUMN fee_collection_schedules.late_fee_amount IS 'Amount for fixed or daily late fee';
COMMENT ON COLUMN fee_collection_schedules.late_fee_percentage IS 'Percentage for percentage-based late fee';
COMMENT ON COLUMN fee_collection_schedules.late_fee_max_amount IS 'Maximum late fee that can be charged';

-- Track late fees applied
CREATE TABLE IF NOT EXISTS late_fee_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES fee_schedule_installments(id) ON DELETE SET NULL,
  days_overdue INTEGER NOT NULL CHECK (days_overdue > 0),
  late_fee_amount DECIMAL(10,2) NOT NULL CHECK (late_fee_amount >= 0),
  calculation_method VARCHAR(50) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  waived BOOLEAN DEFAULT FALSE,
  waived_reason TEXT,
  waived_by UUID REFERENCES users(id),
  waived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_late_fees_student ON late_fee_charges(student_id);
CREATE INDEX idx_late_fees_schedule ON late_fee_charges(schedule_id);

COMMENT ON TABLE late_fee_charges IS 'Track late fee charges applied to students for overdue payments';

-- ============================================
-- 4. PAYMENT STATUS TRACKING
-- ============================================

-- Create payment tracking table for schedules
CREATE TABLE IF NOT EXISTS schedule_payment_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES fee_collection_schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES fee_schedule_installments(id) ON DELETE CASCADE,
  total_amount_due DECIMAL(10,2) NOT NULL CHECK (total_amount_due >= 0),
  amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
  late_fees DECIMAL(10,2) DEFAULT 0 CHECK (late_fees >= 0),
  balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount_due + late_fees - amount_paid) STORED,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  last_payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schedule_id, student_id, installment_id)
);

CREATE INDEX idx_payment_status_schedule ON schedule_payment_status(schedule_id);
CREATE INDEX idx_payment_status_student ON schedule_payment_status(student_id);
CREATE INDEX idx_payment_status_status ON schedule_payment_status(payment_status);

COMMENT ON TABLE schedule_payment_status IS 'Track payment status for each student per schedule/installment';

-- Trigger to auto-update payment status
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance_amount <= 0 THEN
    NEW.payment_status := 'paid';
  ELSIF NEW.amount_paid > 0 AND NEW.balance_amount > 0 THEN
    NEW.payment_status := 'partial';
  ELSIF NEW.balance_amount > 0 THEN
    -- Check if overdue
    DECLARE
      v_due_date DATE;
      v_grace_period INTEGER;
    BEGIN
      IF NEW.installment_id IS NOT NULL THEN
        SELECT due_date, grace_period_days INTO v_due_date, v_grace_period
        FROM fee_schedule_installments WHERE id = NEW.installment_id;
      ELSE
        SELECT due_date, grace_period_days INTO v_due_date, v_grace_period
        FROM fee_collection_schedules WHERE id = NEW.schedule_id;
      END IF;

      IF v_due_date + COALESCE(v_grace_period, 0) < CURRENT_DATE THEN
        NEW.payment_status := 'overdue';
      ELSE
        NEW.payment_status := 'pending';
      END IF;
    END;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_status
  BEFORE INSERT OR UPDATE ON schedule_payment_status
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

-- ============================================
-- 5. CUSTOM REMINDER MESSAGES
-- ============================================

-- Add custom message template to reminders
ALTER TABLE fee_schedule_reminders
ADD COLUMN IF NOT EXISTS custom_message TEXT;

COMMENT ON COLUMN fee_schedule_reminders.custom_message IS 'Custom message template. Supports placeholders: {student_name}, {schedule_name}, {due_date}, {amount}, {installment_name}';

-- ============================================
-- 6. SCHEDULE METADATA & TRACKING
-- ============================================

-- Add metadata for bulk actions
ALTER TABLE fee_collection_schedules
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS cloned_from UUID REFERENCES fee_collection_schedules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_students INTEGER DEFAULT 0;

CREATE INDEX idx_schedules_template ON fee_collection_schedules(is_template) WHERE is_template = TRUE;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to calculate total amount for a schedule/student
CREATE OR REPLACE FUNCTION calculate_schedule_amount(
  p_schedule_id UUID,
  p_student_grade VARCHAR(50)
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    COALESCE(fsi.amount_override, fs.amount::DECIMAL)
  ), 0)
  INTO v_total
  FROM fee_schedule_items fsi
  JOIN fee_structures fs ON fs.fee_category_id = fsi.fee_category_id
  WHERE fsi.schedule_id = p_schedule_id
    AND LOWER(fs.grade) = LOWER(p_student_grade);

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize payment status for all students in a schedule
CREATE OR REPLACE FUNCTION initialize_payment_status(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_student RECORD;
  v_total_amount DECIMAL(10,2);
  v_count INTEGER := 0;
  v_installment RECORD;
  v_is_installment BOOLEAN;
BEGIN
  -- Check if schedule uses installments
  SELECT is_installment INTO v_is_installment
  FROM fee_collection_schedules
  WHERE id = p_schedule_id;

  -- Get all students in the schedule's grades
  FOR v_student IN
    SELECT DISTINCT s.id, s.grade
    FROM students s
    JOIN fee_schedule_grades fsg ON LOWER(s.grade) = LOWER(fsg.grade)
    WHERE fsg.schedule_id = p_schedule_id
      AND s.status = 'active'
  LOOP
    v_total_amount := calculate_schedule_amount(p_schedule_id, v_student.grade);

    IF v_is_installment THEN
      -- Create status for each installment
      FOR v_installment IN
        SELECT id, percentage, fixed_amount
        FROM fee_schedule_installments
        WHERE schedule_id = p_schedule_id
        ORDER BY installment_number
      LOOP
        INSERT INTO schedule_payment_status (
          schedule_id,
          student_id,
          installment_id,
          total_amount_due
        ) VALUES (
          p_schedule_id,
          v_student.id,
          v_installment.id,
          COALESCE(
            v_installment.fixed_amount,
            v_total_amount * v_installment.percentage / 100
          )
        )
        ON CONFLICT (schedule_id, student_id, installment_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;
    ELSE
      -- Create single status entry
      INSERT INTO schedule_payment_status (
        schedule_id,
        student_id,
        installment_id,
        total_amount_due
      ) VALUES (
        p_schedule_id,
        v_student.id,
        NULL,
        v_total_amount
      )
      ON CONFLICT (schedule_id, student_id, installment_id) DO NOTHING;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and apply late fees
CREATE OR REPLACE FUNCTION calculate_late_fees(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_schedule RECORD;
  v_status RECORD;
  v_days_overdue INTEGER;
  v_late_fee DECIMAL(10,2);
  v_count INTEGER := 0;
  v_due_date DATE;
  v_grace_period INTEGER;
BEGIN
  -- Get schedule late fee configuration
  SELECT * INTO v_schedule
  FROM fee_collection_schedules
  WHERE id = p_schedule_id
    AND late_fee_enabled = TRUE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Process each unpaid/partial payment
  FOR v_status IN
    SELECT sps.*,
           COALESCE(fsi.due_date, fcs.due_date) as due_date,
           COALESCE(fsi.grace_period_days, fcs.grace_period_days) as grace_period
    FROM schedule_payment_status sps
    JOIN fee_collection_schedules fcs ON fcs.id = sps.schedule_id
    LEFT JOIN fee_schedule_installments fsi ON fsi.id = sps.installment_id
    WHERE sps.schedule_id = p_schedule_id
      AND sps.payment_status IN ('pending', 'partial', 'overdue')
      AND sps.balance_amount > 0
  LOOP
    v_days_overdue := CURRENT_DATE - (v_status.due_date + COALESCE(v_status.grace_period, 0));

    IF v_days_overdue > 0 THEN
      -- Calculate late fee
      CASE v_schedule.late_fee_type
        WHEN 'fixed' THEN
          v_late_fee := v_schedule.late_fee_amount;
        WHEN 'percentage' THEN
          v_late_fee := v_status.balance_amount * v_schedule.late_fee_percentage / 100;
        WHEN 'daily' THEN
          v_late_fee := v_schedule.late_fee_amount * v_days_overdue;
        ELSE
          v_late_fee := 0;
      END CASE;

      -- Apply max cap if set
      IF v_schedule.late_fee_max_amount IS NOT NULL THEN
        v_late_fee := LEAST(v_late_fee, v_schedule.late_fee_max_amount);
      END IF;

      -- Record the late fee charge (check if already applied today)
      IF NOT EXISTS (
        SELECT 1 FROM late_fee_charges
        WHERE schedule_id = p_schedule_id
          AND student_id = v_status.student_id
          AND installment_id IS NOT DISTINCT FROM v_status.installment_id
          AND DATE(applied_at) = CURRENT_DATE
      ) THEN
        INSERT INTO late_fee_charges (
          schedule_id,
          student_id,
          installment_id,
          days_overdue,
          late_fee_amount,
          calculation_method
        ) VALUES (
          p_schedule_id,
          v_status.student_id,
          v_status.installment_id,
          v_days_overdue,
          v_late_fee,
          v_schedule.late_fee_type
        );

        -- Update payment status with late fee
        UPDATE schedule_payment_status
        SET late_fees = late_fees + v_late_fee
        WHERE id = v_status.id;

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update schedule statistics
CREATE OR REPLACE FUNCTION update_schedule_statistics(p_schedule_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE fee_collection_schedules
  SET
    total_students = (
      SELECT COUNT(DISTINCT student_id)
      FROM schedule_payment_status
      WHERE schedule_id = p_schedule_id
    ),
    paid_students = (
      SELECT COUNT(DISTINCT student_id)
      FROM schedule_payment_status
      WHERE schedule_id = p_schedule_id
        AND payment_status = 'paid'
    ),
    pending_students = (
      SELECT COUNT(DISTINCT student_id)
      FROM schedule_payment_status
      WHERE schedule_id = p_schedule_id
        AND payment_status IN ('pending', 'partial')
    ),
    overdue_students = (
      SELECT COUNT(DISTINCT student_id)
      FROM schedule_payment_status
      WHERE schedule_id = p_schedule_id
        AND payment_status = 'overdue'
    )
  WHERE id = p_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_schedule_installments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON late_fee_charges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_payment_status TO authenticated;

-- Create RLS policies
ALTER TABLE fee_schedule_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_fee_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_payment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installments in their school" ON fee_schedule_installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fee_collection_schedules fcs
      JOIN users u ON u.school_id = fcs.school_id
      WHERE fcs.id = schedule_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "School admins can manage installments" ON fee_schedule_installments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fee_collection_schedules fcs
      JOIN users u ON u.school_id = fcs.school_id
      WHERE fcs.id = schedule_id AND u.id = auth.uid() AND u.role IN ('school_admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view late fees in their school" ON late_fee_charges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN users u ON u.school_id = s.school_id
      WHERE s.id = student_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "School admins can manage late fees" ON late_fee_charges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN users u ON u.school_id = s.school_id
      WHERE s.id = student_id AND u.id = auth.uid() AND u.role IN ('school_admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view payment status in their school" ON schedule_payment_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN users u ON u.school_id = s.school_id
      WHERE s.id = student_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "School admins can manage payment status" ON schedule_payment_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN users u ON u.school_id = s.school_id
      WHERE s.id = student_id AND u.id = auth.uid() AND u.role IN ('school_admin', 'super_admin')
    )
  );
