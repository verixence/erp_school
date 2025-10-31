-- Create fee receipts table to store payment receipts
CREATE TABLE IF NOT EXISTS fee_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  receipt_no VARCHAR(50) NOT NULL,
  receipt_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Student information (snapshot at time of payment)
  student_name VARCHAR(255) NOT NULL,
  student_admission_no VARCHAR(50),
  student_grade VARCHAR(50),
  student_section VARCHAR(50),

  -- Parent information
  parent_name VARCHAR(255),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(255),

  -- Payment information
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,

  -- Receipt details (JSON for flexibility)
  -- For single payment: {fee_type, amount, demand_id}
  -- For bulk payment: [{fee_type, amount, demand_id}, ...]
  receipt_items JSONB NOT NULL,

  -- Totals
  total_amount DECIMAL(10, 2) NOT NULL,

  -- School information (snapshot)
  school_name VARCHAR(255),
  school_address TEXT,
  school_phone VARCHAR(20),
  school_email VARCHAR(255),
  school_logo_url TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_receipt_no_per_school UNIQUE(school_id, receipt_no)
);

-- Create indexes for faster queries
CREATE INDEX idx_fee_receipts_school_id ON fee_receipts(school_id);
CREATE INDEX idx_fee_receipts_student_id ON fee_receipts(student_id);
CREATE INDEX idx_fee_receipts_receipt_no ON fee_receipts(receipt_no);
CREATE INDEX idx_fee_receipts_receipt_date ON fee_receipts(receipt_date DESC);
CREATE INDEX idx_fee_receipts_parent_email ON fee_receipts(parent_email) WHERE parent_email IS NOT NULL;

-- Enable RLS
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- School admins can view all receipts for their school
CREATE POLICY "School admins can view receipts" ON fee_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.school_id = fee_receipts.school_id
      AND users.role IN ('school_admin', 'teacher')
    )
  );

-- School admins can insert receipts
CREATE POLICY "School admins can insert receipts" ON fee_receipts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.school_id = fee_receipts.school_id
      AND users.role = 'school_admin'
    )
  );

-- Parents can view their own children's receipts
CREATE POLICY "Parents can view own receipts" ON fee_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      WHERE sp.parent_id = auth.uid()
      AND sp.student_id = fee_receipts.student_id
    )
  );

-- Add comment
COMMENT ON TABLE fee_receipts IS 'Stores fee payment receipts for students with complete snapshot of payment details';
