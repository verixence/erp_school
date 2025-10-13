-- Complete Fee Management System Migration
-- Creates missing tables and updates existing ones for comprehensive fee management

-- Create fee_invoices table for billing
CREATE TABLE IF NOT EXISTS fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    billing_period VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'annual', etc.
    due_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    due_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue', 'cancelled'
    late_fee_applied DECIMAL(10,2) DEFAULT 0,
    discount_applied DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_student_billing_period UNIQUE(school_id, student_id, academic_year, billing_period)
);

-- Create fee_payments table for payment tracking
CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'card', 'bank_transfer', 'online', 'cheque', 'dd'
    payment_reference VARCHAR(200), -- cheque number, transaction ID, etc.
    payment_gateway_id VARCHAR(200), -- for online payments
    gateway_response JSONB, -- full gateway response
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'failed', 'pending', 'refunded'
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create school_expenses table for expense tracking
CREATE TABLE IF NOT EXISTS school_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    expense_number VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'utilities', 'supplies', 'maintenance', 'salaries', etc.
    subcategory VARCHAR(100),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50), -- 'cash', 'cheque', 'bank_transfer', etc.
    payment_reference VARCHAR(200),
    vendor_name VARCHAR(200),
    vendor_contact TEXT,
    receipt_url TEXT,
    approved_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bank_accounts table for bank management
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    account_name VARCHAR(200) NOT NULL,
    bank_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20),
    branch_name VARCHAR(200),
    account_type VARCHAR(50) DEFAULT 'current', -- 'savings', 'current'
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_account_per_school UNIQUE(school_id, account_number)
);

-- Create cheque_register table for cheque tracking
CREATE TABLE IF NOT EXISTS cheque_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    cheque_number VARCHAR(50) NOT NULL,
    cheque_date DATE NOT NULL,
    payee_name VARCHAR(200) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    purpose TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'issued', -- 'issued', 'cleared', 'bounced', 'cancelled', 'pending'
    cleared_date DATE,
    payment_id UUID REFERENCES fee_payments(id), -- if related to fee payment
    expense_id UUID REFERENCES school_expenses(id), -- if related to expense
    issued_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_cheque_number UNIQUE(bank_account_id, cheque_number)
);

-- Create fee_invoice_items table for detailed billing
CREATE TABLE IF NOT EXISTS fee_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
    description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing student_fees table structure if needed
DO $$
BEGIN
    -- Add columns to student_fees if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_fees' AND column_name = 'discount_percentage') THEN
        ALTER TABLE student_fees ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_fees' AND column_name = 'is_active') THEN
        ALTER TABLE student_fees ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_fees' AND column_name = 'assigned_at') THEN
        ALTER TABLE student_fees ADD COLUMN assigned_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fee_invoices_school_student ON fee_invoices(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status ON fee_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_due_date ON fee_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_processed_at ON fee_payments(processed_at);
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_category ON school_expenses(school_id, category);
CREATE INDEX IF NOT EXISTS idx_school_expenses_date ON school_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_cheque_register_bank_account ON cheque_register(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cheque_register_status ON cheque_register(status);

-- Create functions for automatic calculations

-- Function to update invoice amounts when payment is made
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update invoice totals when payment is added/updated
    UPDATE fee_invoices SET
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM fee_payments 
            WHERE invoice_id = NEW.invoice_id AND status = 'success'
        ),
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    -- Update due amount and status
    UPDATE fee_invoices SET
        due_amount = total_amount - paid_amount,
        status = CASE 
            WHEN paid_amount >= total_amount THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            WHEN due_date < CURRENT_DATE AND paid_amount = 0 THEN 'overdue'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment updates
DROP TRIGGER IF EXISTS update_invoice_on_payment ON fee_payments;
CREATE TRIGGER update_invoice_on_payment
    AFTER INSERT OR UPDATE ON fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Function to generate payment numbers
CREATE OR REPLACE FUNCTION generate_payment_number(p_school_id UUID)
RETURNS TEXT AS $$
DECLARE
    payment_count INTEGER;
    current_year TEXT;
    payment_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COUNT(*) + 1 INTO payment_count
    FROM fee_payments fp
    JOIN fee_invoices fi ON fp.invoice_id = fi.id
    WHERE fi.school_id = p_school_id
    AND EXTRACT(YEAR FROM fp.created_at) = EXTRACT(YEAR FROM NOW());
    
    payment_number := 'PAY-' || current_year || '-' || LPAD(payment_count::TEXT, 6, '0');
    
    RETURN payment_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(p_school_id UUID)
RETURNS TEXT AS $$
DECLARE
    invoice_count INTEGER;
    current_year TEXT;
    invoice_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COUNT(*) + 1 INTO invoice_count
    FROM fee_invoices
    WHERE school_id = p_school_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    invoice_number := 'INV-' || current_year || '-' || LPAD(invoice_count::TEXT, 6, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate expense numbers
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

-- Update fee_structures table if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'is_active') THEN
        ALTER TABLE fee_structures ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_categories' AND column_name = 'is_active') THEN
        ALTER TABLE fee_categories ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Row Level Security (RLS) policies
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheque_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoice_items ENABLE ROW LEVEL SECURITY;

-- Policies for fee_invoices
CREATE POLICY fee_invoices_school_isolation ON fee_invoices
    USING (school_id = current_setting('app.current_school_id')::UUID);

-- Policies for fee_payments (through invoice relationship)
CREATE POLICY fee_payments_school_isolation ON fee_payments
    USING (EXISTS (
        SELECT 1 FROM fee_invoices 
        WHERE fee_invoices.id = fee_payments.invoice_id 
        AND fee_invoices.school_id = current_setting('app.current_school_id')::UUID
    ));

-- Policies for other tables
CREATE POLICY school_expenses_school_isolation ON school_expenses
    USING (school_id = current_setting('app.current_school_id')::UUID);

CREATE POLICY bank_accounts_school_isolation ON bank_accounts
    USING (school_id = current_setting('app.current_school_id')::UUID);

CREATE POLICY cheque_register_school_isolation ON cheque_register
    USING (school_id = current_setting('app.current_school_id')::UUID);

CREATE POLICY fee_invoice_items_school_isolation ON fee_invoice_items
    USING (EXISTS (
        SELECT 1 FROM fee_invoices 
        WHERE fee_invoices.id = fee_invoice_items.invoice_id 
        AND fee_invoices.school_id = current_setting('app.current_school_id')::UUID
    ));

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fee_invoices_updated_at BEFORE UPDATE ON fee_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_payments_updated_at BEFORE UPDATE ON fee_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_school_expenses_updated_at BEFORE UPDATE ON school_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cheque_register_updated_at BEFORE UPDATE ON cheque_register FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional, can be commented out for production)
/*
-- Sample bank account
INSERT INTO bank_accounts (school_id, account_name, bank_name, account_number, ifsc_code, branch_name, is_primary)
SELECT id, 'School Current Account', 'State Bank of India', '1234567890', 'SBIN0001234', 'Main Branch', true
FROM schools WHERE name = 'Campus High School'
ON CONFLICT (school_id, account_number) DO NOTHING;
*/

COMMENT ON TABLE fee_invoices IS 'Stores student fee invoices with billing details';
COMMENT ON TABLE fee_payments IS 'Tracks all payments made against invoices';
COMMENT ON TABLE school_expenses IS 'Manages school operational expenses';
COMMENT ON TABLE bank_accounts IS 'School bank account master data';
COMMENT ON TABLE cheque_register IS 'Tracks issued cheques and their status';
COMMENT ON TABLE fee_invoice_items IS 'Line items for detailed invoice breakdown';