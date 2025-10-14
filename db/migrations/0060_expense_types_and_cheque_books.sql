-- Expense Types, Bank Accounts and Cheque Books Migration
-- Adds expense type master, bank accounts master and cheque book master tables

-- Create bank_accounts table for managing school bank accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    account_name VARCHAR(200) NOT NULL,
    bank_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20),
    branch_name VARCHAR(200),
    account_type VARCHAR(20) DEFAULT 'current', -- 'savings', 'current'
    opening_balance NUMERIC(12, 2) DEFAULT 0,
    current_balance NUMERIC(12, 2) DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_account_number_per_school UNIQUE(school_id, account_number)
);

-- Create expense_types table for expense categorization
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_expense_type_per_school UNIQUE(school_id, name)
);

-- Create cheque_books table for managing cheque book allocations
CREATE TABLE IF NOT EXISTS cheque_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    book_name VARCHAR(200) NOT NULL,
    cheque_start_no VARCHAR(50) NOT NULL,
    cheque_end_no VARCHAR(50) NOT NULL,
    total_cheques INTEGER GENERATED ALWAYS AS (
        CAST(cheque_end_no AS INTEGER) - CAST(cheque_start_no AS INTEGER) + 1
    ) STORED,
    used_cheques INTEGER DEFAULT 0,
    remaining_cheques INTEGER GENERATED ALWAYS AS (
        CAST(cheque_end_no AS INTEGER) - CAST(cheque_start_no AS INTEGER) + 1 - used_cheques
    ) STORED,
    issued_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'exhausted', 'cancelled'
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_cheque_book_per_account UNIQUE(bank_account_id, book_name),
    CONSTRAINT valid_cheque_range CHECK (CAST(cheque_start_no AS INTEGER) <= CAST(cheque_end_no AS INTEGER))
);

-- Update school_expenses table to use expense_types (if it exists)
DO $$
BEGIN
    -- Check if school_expenses table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_expenses') THEN
        -- Add expense_type_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_expenses' AND column_name = 'expense_type_id') THEN
            ALTER TABLE school_expenses ADD COLUMN expense_type_id UUID REFERENCES expense_types(id);
        END IF;

        -- Add bank_account_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_expenses' AND column_name = 'bank_account_id') THEN
            ALTER TABLE school_expenses ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
        END IF;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_school ON bank_accounts(school_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON bank_accounts(school_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_expense_types_school ON expense_types(school_id);
CREATE INDEX IF NOT EXISTS idx_cheque_books_school ON cheque_books(school_id);
CREATE INDEX IF NOT EXISTS idx_cheque_books_bank_account ON cheque_books(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cheque_books_status ON cheque_books(status);

-- Row Level Security
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheque_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_accounts
DROP POLICY IF EXISTS bank_accounts_select_policy ON bank_accounts;
DROP POLICY IF EXISTS bank_accounts_insert_policy ON bank_accounts;
DROP POLICY IF EXISTS bank_accounts_update_policy ON bank_accounts;
DROP POLICY IF EXISTS bank_accounts_delete_policy ON bank_accounts;

CREATE POLICY bank_accounts_select_policy ON bank_accounts
    FOR SELECT
    USING (true);

CREATE POLICY bank_accounts_insert_policy ON bank_accounts
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY bank_accounts_update_policy ON bank_accounts
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY bank_accounts_delete_policy ON bank_accounts
    FOR DELETE
    USING (true);

-- RLS Policies for expense_types
DROP POLICY IF EXISTS expense_types_select_policy ON expense_types;
DROP POLICY IF EXISTS expense_types_insert_policy ON expense_types;
DROP POLICY IF EXISTS expense_types_update_policy ON expense_types;
DROP POLICY IF EXISTS expense_types_delete_policy ON expense_types;

CREATE POLICY expense_types_select_policy ON expense_types
    FOR SELECT
    USING (true);

CREATE POLICY expense_types_insert_policy ON expense_types
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY expense_types_update_policy ON expense_types
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY expense_types_delete_policy ON expense_types
    FOR DELETE
    USING (true);

-- RLS Policies for cheque_books
DROP POLICY IF EXISTS cheque_books_select_policy ON cheque_books;
DROP POLICY IF EXISTS cheque_books_insert_policy ON cheque_books;
DROP POLICY IF EXISTS cheque_books_update_policy ON cheque_books;
DROP POLICY IF EXISTS cheque_books_delete_policy ON cheque_books;

CREATE POLICY cheque_books_select_policy ON cheque_books
    FOR SELECT
    USING (true);

CREATE POLICY cheque_books_insert_policy ON cheque_books
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY cheque_books_update_policy ON cheque_books
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY cheque_books_delete_policy ON cheque_books
    FOR DELETE
    USING (true);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_types_updated_at ON expense_types;
CREATE TRIGGER update_expense_types_updated_at
    BEFORE UPDATE ON expense_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cheque_books_updated_at ON cheque_books;
CREATE TRIGGER update_cheque_books_updated_at
    BEFORE UPDATE ON cheque_books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update cheque book status
CREATE OR REPLACE FUNCTION update_cheque_book_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on remaining cheques
    IF NEW.used_cheques >= (CAST(NEW.cheque_end_no AS INTEGER) - CAST(NEW.cheque_start_no AS INTEGER) + 1) THEN
        NEW.status := 'exhausted';
    ELSIF NEW.status = 'exhausted' AND NEW.used_cheques < (CAST(NEW.cheque_end_no AS INTEGER) - CAST(NEW.cheque_start_no AS INTEGER) + 1) THEN
        NEW.status := 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cheque_book_status_trigger ON cheque_books;
CREATE TRIGGER cheque_book_status_trigger
    BEFORE INSERT OR UPDATE ON cheque_books
    FOR EACH ROW
    EXECUTE FUNCTION update_cheque_book_status();

COMMENT ON TABLE bank_accounts IS 'Master table for school bank accounts';
COMMENT ON TABLE expense_types IS 'Master table for expense type categories';
COMMENT ON TABLE cheque_books IS 'Tracks cheque book allocations for bank accounts';
COMMENT ON COLUMN cheque_books.total_cheques IS 'Auto-calculated from start and end numbers';
COMMENT ON COLUMN cheque_books.remaining_cheques IS 'Auto-calculated: total - used';
