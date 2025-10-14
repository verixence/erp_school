-- ============================================
-- APPLY THIS SQL IN SUPABASE SQL EDITOR
-- ============================================
-- This will fix the school_expenses table and add missing columns

-- Step 1: Check if table exists, if not create it
CREATE TABLE IF NOT EXISTS school_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    expense_number VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(200),
    vendor_name VARCHAR(200),
    vendor_contact TEXT,
    receipt_url TEXT,
    approved_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add notes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'school_expenses' AND column_name = 'notes'
    ) THEN
        ALTER TABLE school_expenses ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    ELSE
        RAISE NOTICE 'notes column already exists';
    END IF;

    -- Add receipt_file_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'school_expenses' AND column_name = 'receipt_file_name'
    ) THEN
        ALTER TABLE school_expenses ADD COLUMN receipt_file_name VARCHAR(255);
        RAISE NOTICE 'Added receipt_file_name column';
    ELSE
        RAISE NOTICE 'receipt_file_name column already exists';
    END IF;

    -- Add expense_type_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'school_expenses' AND column_name = 'expense_type_id'
    ) THEN
        -- Check if expense_types table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_types') THEN
            ALTER TABLE school_expenses ADD COLUMN expense_type_id UUID REFERENCES expense_types(id);
            RAISE NOTICE 'Added expense_type_id column';
        ELSE
            RAISE NOTICE 'expense_types table does not exist, skipping expense_type_id column';
        END IF;
    ELSE
        RAISE NOTICE 'expense_type_id column already exists';
    END IF;
END $$;

-- Step 3: Create generate_expense_number function if not exists
CREATE OR REPLACE FUNCTION generate_expense_number(p_school_id UUID)
RETURNS TEXT AS $$
DECLARE
    expense_count INTEGER;
    current_year TEXT;
    expense_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;

    SELECT COUNT(*) + 1 INTO expense_count
    FROM school_expenses
    WHERE school_id = p_school_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    expense_number := 'EXP-' || current_year || '-' || LPAD(expense_count::TEXT, 6, '0');

    RETURN expense_number;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_category ON school_expenses(school_id, category);
CREATE INDEX IF NOT EXISTS idx_school_expenses_date ON school_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_school_expenses_status ON school_expenses(school_id, status);

-- Step 5: Enable RLS
ALTER TABLE school_expenses ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policy if exists and recreate
DROP POLICY IF EXISTS school_expenses_school_isolation ON school_expenses;

CREATE POLICY school_expenses_school_isolation ON school_expenses
    USING (school_id = current_setting('app.current_school_id', true)::UUID);

-- Step 7: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_school_expenses_updated_at ON school_expenses;

CREATE TRIGGER update_school_expenses_updated_at
    BEFORE UPDATE ON school_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Verify the changes
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'school_expenses'
ORDER BY ordinal_position;

SELECT 'Setup complete!' as status;
