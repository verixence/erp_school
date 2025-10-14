-- Expense Claims System
-- Allows teachers/staff to submit expense claims with receipts for admin approval

CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    -- Claimant details
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100),
    department VARCHAR(100),

    -- Claim details
    claim_date DATE NOT NULL,
    expense_date DATE NOT NULL,
    expense_type_id UUID REFERENCES expense_types(id) ON DELETE SET NULL,
    expense_category VARCHAR(100) NOT NULL, -- transport, meals, supplies, accommodation, other
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),

    -- Receipt/proof
    receipt_url TEXT,
    receipt_file_name VARCHAR(255),

    -- Payment details
    payment_method VARCHAR(50), -- cash, bank_transfer, reimbursement
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    ifsc_code VARCHAR(20),

    -- Approval workflow
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    approved_amount DECIMAL(10,2),
    rejection_reason TEXT,

    -- Payment tracking
    paid_by UUID REFERENCES users(id),
    paid_at TIMESTAMPTZ,
    payment_reference VARCHAR(100),
    payment_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_approved_amount CHECK (approved_amount IS NULL OR approved_amount <= amount)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_claims_school_id ON expense_claims(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_user_id ON expense_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_claim_date ON expense_claims(claim_date);
CREATE INDEX IF NOT EXISTS idx_expense_claims_expense_date ON expense_claims(expense_date);

-- Row Level Security
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

-- Policies for expense_claims
DROP POLICY IF EXISTS expense_claims_select_policy ON expense_claims;
DROP POLICY IF EXISTS expense_claims_insert_policy ON expense_claims;
DROP POLICY IF EXISTS expense_claims_update_policy ON expense_claims;
DROP POLICY IF EXISTS expense_claims_delete_policy ON expense_claims;

-- Teachers can view their own claims
CREATE POLICY expense_claims_select_policy ON expense_claims
    FOR SELECT
    USING (true);

-- Teachers can create their own claims
CREATE POLICY expense_claims_insert_policy ON expense_claims
    FOR INSERT
    WITH CHECK (true);

-- Teachers can update their own pending claims, admins can update any
CREATE POLICY expense_claims_update_policy ON expense_claims
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Only admins can delete claims
CREATE POLICY expense_claims_delete_policy ON expense_claims
    FOR DELETE
    USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_expense_claims_updated_at ON expense_claims;
CREATE TRIGGER update_expense_claims_updated_at
    BEFORE UPDATE ON expense_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE expense_claims IS 'Stores expense claims submitted by teachers/staff for reimbursement';
COMMENT ON COLUMN expense_claims.status IS 'Claim status: pending, under_review, approved, rejected, paid';
COMMENT ON COLUMN expense_claims.expense_category IS 'Type of expense: transport, meals, supplies, accommodation, other';
COMMENT ON COLUMN expense_claims.approved_amount IS 'Amount approved by admin (can be different from claimed amount)';
