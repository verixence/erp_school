-- Inventory Management System Migration
-- This creates a comprehensive inventory tracking system for schools

-- 1. Inventory Categories Table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- 2. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES inventory_categories(id) ON DELETE RESTRICT,
  item_code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_of_measurement VARCHAR(50), -- pcs, kg, ltr, box, etc.
  minimum_stock_level INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  location VARCHAR(200), -- Room, Cabinet, Lab, etc.
  condition VARCHAR(50) DEFAULT 'good', -- good, fair, poor, damaged
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, retired
  purchase_date DATE,
  warranty_expiry_date DATE,
  supplier_name VARCHAR(200),
  serial_number VARCHAR(100),
  barcode VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, item_code)
);

-- 3. Stock Transactions Table (for tracking stock changes)
CREATE TABLE IF NOT EXISTS inventory_stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- purchase, issue, return, adjustment, damage, loss
  quantity INTEGER NOT NULL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Item Issuance Table (track who has what)
CREATE TABLE IF NOT EXISTS inventory_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  issued_to_type VARCHAR(50) NOT NULL, -- student, teacher, staff, department
  issued_to_id UUID, -- references students or users table
  issued_to_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  return_condition VARCHAR(50), -- good, damaged, lost
  issued_by UUID REFERENCES users(id),
  returned_to UUID REFERENCES users(id),
  purpose TEXT,
  status VARCHAR(50) DEFAULT 'issued', -- issued, returned, overdue, lost
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Maintenance Records Table
CREATE TABLE IF NOT EXISTS inventory_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL, -- repair, service, inspection, cleaning
  maintenance_date DATE DEFAULT CURRENT_DATE,
  cost DECIMAL(10, 2) DEFAULT 0,
  vendor_name VARCHAR(200),
  description TEXT,
  next_maintenance_date DATE,
  performed_by VARCHAR(200),
  status VARCHAR(50) DEFAULT 'completed', -- scheduled, in-progress, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Purchase Orders Table
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  po_number VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  supplier_contact VARCHAR(100),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, ordered, delivered, cancelled
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, po_number)
);

-- 7. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_school_category ON inventory_items(school_id, category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(school_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(school_id, current_stock) WHERE current_stock <= minimum_stock_level;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_stock_transactions(item_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_issuances_status ON inventory_issuances(school_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_issuances_overdue ON inventory_issuances(school_id, expected_return_date) WHERE status = 'issued' AND expected_return_date < CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_inventory_maintenance_item ON inventory_maintenance(item_id, maintenance_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_po_status ON inventory_purchase_orders(school_id, status);

-- Enable Row Level Security
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Inventory Categories
CREATE POLICY "Users can view their school's inventory categories"
  ON inventory_categories FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage inventory categories"
  ON inventory_categories FOR ALL
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')));

-- RLS Policies for Inventory Items
CREATE POLICY "Users can view their school's inventory items"
  ON inventory_items FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage inventory items"
  ON inventory_items FOR ALL
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')));

-- RLS Policies for Stock Transactions
CREATE POLICY "Users can view their school's stock transactions"
  ON inventory_stock_transactions FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage stock transactions"
  ON inventory_stock_transactions FOR ALL
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')));

-- RLS Policies for Issuances
CREATE POLICY "Users can view their school's issuances"
  ON inventory_issuances FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage issuances"
  ON inventory_issuances FOR ALL
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')));

-- RLS Policies for Maintenance
CREATE POLICY "Users can view their school's maintenance records"
  ON inventory_maintenance FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage maintenance records"
  ON inventory_maintenance FOR ALL
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')));

-- RLS Policies for Purchase Orders
CREATE POLICY "Users can view their school's purchase orders"
  ON inventory_purchase_orders FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage purchase orders"
  ON inventory_purchase_orders FOR ALL
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')));

-- RLS Policies for Purchase Order Items
CREATE POLICY "Users can view purchase order items"
  ON inventory_purchase_order_items FOR SELECT
  USING (purchase_order_id IN (SELECT id FROM inventory_purchase_orders WHERE school_id IN (SELECT school_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Admins can manage purchase order items"
  ON inventory_purchase_order_items FOR ALL
  USING (purchase_order_id IN (SELECT id FROM inventory_purchase_orders WHERE school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin'))))
  WITH CHECK (purchase_order_id IN (SELECT id FROM inventory_purchase_orders WHERE school_id IN (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin'))));

-- Create function to update inventory stock on transaction
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type IN ('purchase', 'return', 'adjustment') THEN
    UPDATE inventory_items
    SET current_stock = current_stock + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type IN ('issue', 'damage', 'loss') THEN
    UPDATE inventory_items
    SET current_stock = current_stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON inventory_stock_transactions;
CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON inventory_stock_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_stock();

-- Create function to auto-update issuance status based on return date
CREATE OR REPLACE FUNCTION update_issuance_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_return_date IS NOT NULL THEN
    NEW.status := 'returned';
  ELSIF NEW.expected_return_date < CURRENT_DATE AND NEW.status = 'issued' THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for issuance status updates
DROP TRIGGER IF EXISTS trigger_update_issuance_status ON inventory_issuances;
CREATE TRIGGER trigger_update_issuance_status
  BEFORE INSERT OR UPDATE ON inventory_issuances
  FOR EACH ROW
  EXECUTE FUNCTION update_issuance_status();
