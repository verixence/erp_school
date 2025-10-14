-- Migration: Enhanced school_expenses table with receipt support and notes
-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'school_expenses' AND column_name = 'notes') THEN
        ALTER TABLE school_expenses ADD COLUMN notes TEXT;
    END IF;

    -- Ensure receipt_url column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'school_expenses' AND column_name = 'receipt_url') THEN
        ALTER TABLE school_expenses ADD COLUMN receipt_url TEXT;
    END IF;

    -- Ensure receipt_file_name column exists for better tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'school_expenses' AND column_name = 'receipt_file_name') THEN
        ALTER TABLE school_expenses ADD COLUMN receipt_file_name VARCHAR(255);
    END IF;
END $$;

-- Create storage bucket for expense receipts if not exists (via Supabase dashboard or API)
-- This is just a documentation comment - actual bucket creation happens in app code

-- Add expense_type_id if not already added by migration 0060
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'school_expenses' AND column_name = 'expense_type_id') THEN
        ALTER TABLE school_expenses ADD COLUMN expense_type_id UUID REFERENCES expense_types(id);
    END IF;
END $$;

COMMENT ON COLUMN school_expenses.notes IS 'Additional notes or remarks about the expense';
COMMENT ON COLUMN school_expenses.receipt_url IS 'URL to uploaded receipt file in storage';
COMMENT ON COLUMN school_expenses.receipt_file_name IS 'Original filename of uploaded receipt';
COMMENT ON COLUMN school_expenses.expense_type_id IS 'Links to predefined expense types';
