-- Add payment tracking columns to student_fee_demands
-- This migration adds paid_amount, balance_amount, and payment_status columns

-- Add paid_amount column (tracks how much has been paid)
ALTER TABLE student_fee_demands
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- Add balance_amount column (tracks remaining balance)
ALTER TABLE student_fee_demands
ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(10,2);

-- Add payment_status column (pending, partial, paid)
ALTER TABLE student_fee_demands
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Update balance_amount for existing records (demand_amount - paid_amount)
UPDATE student_fee_demands
SET balance_amount = demand_amount - COALESCE(paid_amount, 0)
WHERE balance_amount IS NULL;

-- Add check constraint for payment_status
ALTER TABLE student_fee_demands
ADD CONSTRAINT IF NOT EXISTS check_payment_status
CHECK (payment_status IN ('pending', 'partial', 'paid', 'waived', 'cancelled'));

-- Create function to automatically calculate balance_amount
CREATE OR REPLACE FUNCTION calculate_balance_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_amount := NEW.demand_amount - COALESCE(NEW.paid_amount, 0);

    -- Auto-update payment status
    IF NEW.balance_amount <= 0 THEN
        NEW.payment_status := 'paid';
    ELSIF NEW.paid_amount > 0 THEN
        NEW.payment_status := 'partial';
    ELSE
        NEW.payment_status := 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate balance_amount
DROP TRIGGER IF EXISTS calculate_balance_amount_trigger ON student_fee_demands;
CREATE TRIGGER calculate_balance_amount_trigger
    BEFORE INSERT OR UPDATE ON student_fee_demands
    FOR EACH ROW
    EXECUTE FUNCTION calculate_balance_amount();

-- Add index for payment_status for faster queries
CREATE INDEX IF NOT EXISTS idx_student_fee_demands_payment_status
ON student_fee_demands(payment_status);

-- Add comments
COMMENT ON COLUMN student_fee_demands.paid_amount IS 'Total amount paid by the student for this fee';
COMMENT ON COLUMN student_fee_demands.balance_amount IS 'Remaining balance (demand_amount - paid_amount)';
COMMENT ON COLUMN student_fee_demands.payment_status IS 'Payment status: pending, partial, paid, waived, cancelled';
