-- Add due_date column to student_fee_demands table
ALTER TABLE student_fee_demands
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add index for due_date queries
CREATE INDEX IF NOT EXISTS idx_student_fee_demands_due_date
ON student_fee_demands(due_date);

-- Add index for overdue fee queries (payment_status + due_date)
CREATE INDEX IF NOT EXISTS idx_student_fee_demands_overdue
ON student_fee_demands(payment_status, due_date)
WHERE payment_status IN ('pending', 'partial');

-- Add comment
COMMENT ON COLUMN student_fee_demands.due_date IS 'Payment due date for this fee demand';
