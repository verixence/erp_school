-- Student Fee Demands Migration
-- Creates table to store per-student customized fee amounts and discounts

CREATE TABLE IF NOT EXISTS student_fee_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,

    -- Original amount from fee structure
    original_amount DECIMAL(10,2) NOT NULL,

    -- Customized discount for this student
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_reason TEXT,

    -- Final demand amount (original - discount)
    demand_amount DECIMAL(10,2) NOT NULL,

    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one demand per student per fee structure per academic year
    CONSTRAINT unique_student_fee_demand UNIQUE(school_id, student_id, fee_structure_id, academic_year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_fee_demands_school_student ON student_fee_demands(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_demands_academic_year ON student_fee_demands(academic_year);
CREATE INDEX IF NOT EXISTS idx_student_fee_demands_fee_structure ON student_fee_demands(fee_structure_id);

-- Row Level Security
ALTER TABLE student_fee_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_fee_demands_school_isolation ON student_fee_demands
    USING (school_id = current_setting('app.current_school_id')::UUID);

-- Trigger for updated_at
CREATE TRIGGER update_student_fee_demands_updated_at
    BEFORE UPDATE ON student_fee_demands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate demand_amount
CREATE OR REPLACE FUNCTION calculate_demand_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.demand_amount := NEW.original_amount - COALESCE(NEW.discount_amount, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_demand_amount_trigger
    BEFORE INSERT OR UPDATE ON student_fee_demands
    FOR EACH ROW
    EXECUTE FUNCTION calculate_demand_amount();

COMMENT ON TABLE student_fee_demands IS 'Stores customized fee amounts and discounts for individual students';
COMMENT ON COLUMN student_fee_demands.discount_reason IS 'Reason for giving discount to this student (e.g., scholarship, sibling discount, financial hardship)';
