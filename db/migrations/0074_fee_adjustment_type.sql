-- Migration: 0074_fee_adjustment_type.sql
-- Description: Add adjustment_type to support both fee discounts and increases
-- Date: 2025-12-07

-- =====================================================
-- STEP 1: Add adjustment_type column
-- =====================================================

-- Add adjustment_type enum column (defaults to 'discount' for backward compatibility)
ALTER TABLE student_fee_demands
ADD COLUMN adjustment_type VARCHAR(20) DEFAULT 'discount' CHECK (adjustment_type IN ('discount', 'increase'));

-- Update existing records to have explicit 'discount' type
UPDATE student_fee_demands
SET adjustment_type = 'discount'
WHERE adjustment_type IS NULL;

-- Make adjustment_type NOT NULL after setting defaults
ALTER TABLE student_fee_demands
ALTER COLUMN adjustment_type SET NOT NULL;

-- =====================================================
-- STEP 2: Rename columns for clarity
-- =====================================================

-- Rename discount_amount to adjustment_amount
ALTER TABLE student_fee_demands
RENAME COLUMN discount_amount TO adjustment_amount;

-- Rename discount_reason to adjustment_reason
ALTER TABLE student_fee_demands
RENAME COLUMN discount_reason TO adjustment_reason;

-- =====================================================
-- STEP 3: Update the calculation trigger
-- =====================================================

-- Drop the old trigger
DROP TRIGGER IF EXISTS calculate_demand_amount_trigger ON student_fee_demands;

-- Drop the old function
DROP FUNCTION IF EXISTS calculate_demand_amount();

-- Create new function that handles both discount and increase
CREATE OR REPLACE FUNCTION calculate_demand_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate demand_amount based on adjustment_type
    IF NEW.adjustment_type = 'discount' THEN
        -- For discount: demand = original - adjustment
        NEW.demand_amount := NEW.original_amount - COALESCE(NEW.adjustment_amount, 0);
    ELSIF NEW.adjustment_type = 'increase' THEN
        -- For increase: demand = original + adjustment
        NEW.demand_amount := NEW.original_amount + COALESCE(NEW.adjustment_amount, 0);
    ELSE
        -- Default case (should not happen due to CHECK constraint)
        NEW.demand_amount := NEW.original_amount;
    END IF;

    -- Ensure demand_amount is never negative
    IF NEW.demand_amount < 0 THEN
        NEW.demand_amount := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER calculate_demand_amount_trigger
    BEFORE INSERT OR UPDATE OF original_amount, adjustment_amount, adjustment_type
    ON student_fee_demands
    FOR EACH ROW
    EXECUTE FUNCTION calculate_demand_amount();

-- =====================================================
-- STEP 4: Add index for filtering by adjustment_type
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_student_fee_demands_adjustment_type
ON student_fee_demands(adjustment_type);

-- =====================================================
-- STEP 5: Add helpful comments
-- =====================================================

COMMENT ON COLUMN student_fee_demands.adjustment_type IS
'Type of fee adjustment: discount (reduce fee) or increase (add extra charges)';

COMMENT ON COLUMN student_fee_demands.adjustment_amount IS
'Amount to adjust the fee by. Used with adjustment_type to calculate final demand_amount';

COMMENT ON COLUMN student_fee_demands.adjustment_reason IS
'Explanation for the fee adjustment (e.g., "Sibling discount", "Late admission fee", "Special coaching fee")';

-- =====================================================
-- VERIFICATION QUERIES (run these to verify migration)
-- =====================================================

-- Check the new column exists
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'student_fee_demands'
-- AND column_name IN ('adjustment_type', 'adjustment_amount', 'adjustment_reason');

-- Check all existing records have 'discount' type
-- SELECT adjustment_type, COUNT(*)
-- FROM student_fee_demands
-- GROUP BY adjustment_type;

-- Test the trigger with a discount
-- UPDATE student_fee_demands
-- SET adjustment_type = 'discount', adjustment_amount = 1000
-- WHERE id = (SELECT id FROM student_fee_demands LIMIT 1);

-- Test the trigger with an increase
-- UPDATE student_fee_demands
-- SET adjustment_type = 'increase', adjustment_amount = 500
-- WHERE id = (SELECT id FROM student_fee_demands LIMIT 1);
