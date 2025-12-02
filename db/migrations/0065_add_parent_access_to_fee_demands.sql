-- Migration: Add Parent Access to Fee Demands and Payment Gateway Settings
-- Adds RLS policies for parents to view their children's fee demands
-- Creates payment gateway configuration table

-- =====================================================
-- Part 1: Update RLS Policies for student_fee_demands
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS student_fee_demands_select_policy ON student_fee_demands;
DROP POLICY IF EXISTS student_fee_demands_insert_policy ON student_fee_demands;
DROP POLICY IF EXISTS student_fee_demands_update_policy ON student_fee_demands;
DROP POLICY IF EXISTS student_fee_demands_delete_policy ON student_fee_demands;

-- Policy for SELECT: School admins and parents can view
CREATE POLICY student_fee_demands_select_policy ON student_fee_demands
    FOR SELECT
    USING (
        -- School admins can see all demands in their school
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = student_fee_demands.school_id
            AND users.role IN ('school_admin', 'teacher')
        )
        OR
        -- Parents can see demands for their children
        EXISTS (
            SELECT 1 FROM student_parents
            WHERE student_parents.parent_id = auth.uid()
            AND student_parents.student_id = student_fee_demands.student_id
        )
    );

-- Policy for INSERT: Only school admins
CREATE POLICY student_fee_demands_insert_policy ON student_fee_demands
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = student_fee_demands.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for UPDATE: Only school admins
CREATE POLICY student_fee_demands_update_policy ON student_fee_demands
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = student_fee_demands.school_id
            AND users.role = 'school_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = student_fee_demands.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for DELETE: Only school admins
CREATE POLICY student_fee_demands_delete_policy ON student_fee_demands
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = student_fee_demands.school_id
            AND users.role = 'school_admin'
        )
    );

-- =====================================================
-- Part 2: Add RLS Policies for fee_structures
-- =====================================================

-- Enable RLS on fee_structures if not already enabled
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS fee_structures_select_policy ON fee_structures;
DROP POLICY IF EXISTS fee_structures_insert_policy ON fee_structures;
DROP POLICY IF EXISTS fee_structures_update_policy ON fee_structures;
DROP POLICY IF EXISTS fee_structures_delete_policy ON fee_structures;

-- Policy for SELECT: School admins and parents can view
CREATE POLICY fee_structures_select_policy ON fee_structures
    FOR SELECT
    USING (
        -- School admins and parents can see fee structures in their school
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_structures.school_id
        )
    );

-- Policy for INSERT: Only school admins
CREATE POLICY fee_structures_insert_policy ON fee_structures
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_structures.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for UPDATE: Only school admins
CREATE POLICY fee_structures_update_policy ON fee_structures
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_structures.school_id
            AND users.role = 'school_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_structures.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for DELETE: Only school admins
CREATE POLICY fee_structures_delete_policy ON fee_structures
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_structures.school_id
            AND users.role = 'school_admin'
        )
    );

-- =====================================================
-- Part 3: Add RLS Policies for fee_categories
-- =====================================================

-- Enable RLS on fee_categories if not already enabled
ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS fee_categories_select_policy ON fee_categories;
DROP POLICY IF EXISTS fee_categories_insert_policy ON fee_categories;
DROP POLICY IF EXISTS fee_categories_update_policy ON fee_categories;
DROP POLICY IF EXISTS fee_categories_delete_policy ON fee_categories;

-- Policy for SELECT: School admins and parents can view
CREATE POLICY fee_categories_select_policy ON fee_categories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_categories.school_id
        )
    );

-- Policy for INSERT: Only school admins
CREATE POLICY fee_categories_insert_policy ON fee_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_categories.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for UPDATE: Only school admins
CREATE POLICY fee_categories_update_policy ON fee_categories
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_categories.school_id
            AND users.role = 'school_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_categories.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for DELETE: Only school admins
CREATE POLICY fee_categories_delete_policy ON fee_categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = fee_categories.school_id
            AND users.role = 'school_admin'
        )
    );

-- =====================================================
-- Part 4: Create Payment Gateway Settings Table
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_gateway_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    -- Gateway configuration
    gateway_provider VARCHAR(50) NOT NULL, -- 'razorpay', 'stripe', 'paytm', 'phonepe', etc.
    is_enabled BOOLEAN DEFAULT false,

    -- API credentials (encrypted in production)
    api_key TEXT, -- Public/publishable key
    api_secret TEXT, -- Secret key (should be encrypted)
    webhook_secret TEXT, -- Webhook signature secret

    -- Additional configuration
    merchant_id VARCHAR(200),
    account_id VARCHAR(200),

    -- Settings
    currency VARCHAR(10) DEFAULT 'INR',
    payment_modes JSONB DEFAULT '["card", "netbanking", "upi", "wallet"]'::jsonb,

    -- Fee configuration
    convenience_fee_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' or 'fixed'
    convenience_fee_value DECIMAL(10,2) DEFAULT 0,
    convenience_fee_bearer VARCHAR(20) DEFAULT 'parent', -- 'parent' or 'school'

    -- Testing/Production mode
    is_test_mode BOOLEAN DEFAULT true,

    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one configuration per school per gateway
    CONSTRAINT unique_school_gateway UNIQUE(school_id, gateway_provider)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateway_settings_school ON payment_gateway_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_settings_enabled ON payment_gateway_settings(school_id, is_enabled) WHERE is_enabled = true;

-- Row Level Security
ALTER TABLE payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS payment_gateway_settings_select_policy ON payment_gateway_settings;
DROP POLICY IF EXISTS payment_gateway_settings_insert_policy ON payment_gateway_settings;
DROP POLICY IF EXISTS payment_gateway_settings_update_policy ON payment_gateway_settings;
DROP POLICY IF EXISTS payment_gateway_settings_delete_policy ON payment_gateway_settings;

-- Policy for SELECT: School admins can view (parents can check if enabled but not see credentials)
CREATE POLICY payment_gateway_settings_select_policy ON payment_gateway_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_gateway_settings.school_id
        )
    );

-- Policy for INSERT: Only school admins
CREATE POLICY payment_gateway_settings_insert_policy ON payment_gateway_settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_gateway_settings.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for UPDATE: Only school admins
CREATE POLICY payment_gateway_settings_update_policy ON payment_gateway_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_gateway_settings.school_id
            AND users.role = 'school_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_gateway_settings.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for DELETE: Only school admins
CREATE POLICY payment_gateway_settings_delete_policy ON payment_gateway_settings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_gateway_settings.school_id
            AND users.role = 'school_admin'
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_gateway_settings_updated_at ON payment_gateway_settings;
CREATE TRIGGER update_payment_gateway_settings_updated_at
    BEFORE UPDATE ON payment_gateway_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE payment_gateway_settings IS 'Stores payment gateway configuration for online fee payments per school';
COMMENT ON COLUMN payment_gateway_settings.api_secret IS 'IMPORTANT: Should be encrypted in production environment';
COMMENT ON COLUMN payment_gateway_settings.webhook_secret IS 'Used to verify webhook signatures from payment gateway';
COMMENT ON COLUMN payment_gateway_settings.is_test_mode IS 'Whether to use test/sandbox mode of the payment gateway';
COMMENT ON COLUMN payment_gateway_settings.convenience_fee_bearer IS 'Who pays the payment gateway charges - parent or school';

-- =====================================================
-- Part 5: Create Payment Transactions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    -- Transaction identification
    transaction_id VARCHAR(200) UNIQUE NOT NULL, -- Our internal transaction ID
    gateway_order_id VARCHAR(200), -- Order ID from payment gateway
    gateway_payment_id VARCHAR(200), -- Payment ID from gateway (after successful payment)
    gateway_signature VARCHAR(500), -- Payment signature for verification

    -- Related entities
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES users(id), -- Parent who initiated payment
    fee_demand_ids UUID[] NOT NULL, -- Array of fee demand IDs being paid

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    convenience_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL, -- amount + convenience_fee
    currency VARCHAR(10) DEFAULT 'INR',

    -- Gateway details
    gateway_provider VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50), -- 'card', 'netbanking', 'upi', 'wallet'

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'initiated', -- 'initiated', 'pending', 'success', 'failed', 'refunded'
    failure_reason TEXT,

    -- Gateway response
    gateway_response JSONB,

    -- Receipt
    receipt_id UUID REFERENCES fee_receipts(id),

    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_school ON payment_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_parent ON payment_transactions(parent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_order ON payment_transactions(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_payment ON payment_transactions(gateway_payment_id);

-- Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS payment_transactions_select_policy ON payment_transactions;
DROP POLICY IF EXISTS payment_transactions_insert_policy ON payment_transactions;
DROP POLICY IF EXISTS payment_transactions_update_policy ON payment_transactions;
DROP POLICY IF EXISTS payment_transactions_delete_policy ON payment_transactions;

-- Policy for SELECT: School admins and parent (for their own transactions)
CREATE POLICY payment_transactions_select_policy ON payment_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_transactions.school_id
            AND users.role IN ('school_admin', 'teacher')
        )
        OR
        parent_id = auth.uid()
    );

-- Policy for INSERT: School admins and parents
CREATE POLICY payment_transactions_insert_policy ON payment_transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_transactions.school_id
            AND users.role = 'school_admin'
        )
        OR
        parent_id = auth.uid()
    );

-- Policy for UPDATE: School admins and system (for webhook updates)
CREATE POLICY payment_transactions_update_policy ON payment_transactions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_transactions.school_id
            AND users.role = 'school_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_transactions.school_id
            AND users.role = 'school_admin'
        )
    );

-- Policy for DELETE: Only school admins
CREATE POLICY payment_transactions_delete_policy ON payment_transactions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = payment_transactions.school_id
            AND users.role = 'school_admin'
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE payment_transactions IS 'Tracks all online payment transactions initiated by parents';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Internal unique transaction identifier';
COMMENT ON COLUMN payment_transactions.gateway_order_id IS 'Order ID from payment gateway (created before payment)';
COMMENT ON COLUMN payment_transactions.gateway_payment_id IS 'Payment ID from gateway (received after successful payment)';
COMMENT ON COLUMN payment_transactions.fee_demand_ids IS 'Array of student_fee_demands IDs being paid in this transaction';
