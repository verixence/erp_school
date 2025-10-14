# School Expense Management Setup Guide

## Overview
This guide covers the setup for the School Expense Management system that allows admins to:
- Create and track school operational expenses
- Upload receipts for expenses
- Categorize expenses using expense types
- Track payment status (Pending → Approved → Paid)
- Generate expense vouchers automatically

## Database Setup

### 1. Run Migration
The system requires migration `0063_school_expenses_enhancements.sql` to add receipt support:

```bash
# Apply the migration through Supabase CLI or dashboard
supabase db push
```

Or manually run the SQL in Supabase SQL Editor:
```sql
-- From: db/migrations/0063_school_expenses_enhancements.sql
```

### 2. Create Storage Bucket
Create a storage bucket for expense receipts in Supabase Dashboard:

**Via Supabase Dashboard:**
1. Go to Storage section
2. Create new bucket named: `expense-receipts`
3. Set as **Public bucket** (for easy access)
4. Configure policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts');

-- Allow public read access
CREATE POLICY "Public can view expense receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expense-receipts');
```

**Via Supabase API (from your app):**
```typescript
// In your app initialization or setup script
const { data, error } = await supabase.storage.createBucket('expense-receipts', {
  public: true,
  fileSizeLimit: 5242880, // 5MB
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
});
```

## Features

### 1. Expense Creation
- **Expense Type**: Select from predefined expense types (Settings > Expense Type)
- **Amount**: Expense amount with 2 decimal precision
- **Date**: When the expense occurred
- **Payment Details**: Method, reference number
- **Vendor Info**: Name and contact
- **Receipt**: Optional file upload (images, PDFs)
- **Description**: Required description of expense
- **Notes**: Additional remarks

### 2. Payment Status Workflow
```
Pending → Approved → Paid
         ↓
      Rejected
```

- **Pending**: Initial state, requires approval
- **Approved**: Admin approved, ready for payment
- **Paid**: Payment completed
- **Rejected**: Expense rejected with reason

### 3. Receipt Management
- Upload images (PNG, JPEG) or PDFs
- Files stored in Supabase Storage
- View receipts in expense details
- Files are sanitized and organized by school ID

## API Endpoints

### GET /api/admin/fees/expenses
Fetch expenses with filters:
- `school_id` (required)
- `status` (optional): pending, approved, paid, rejected
- `category` (optional)
- `from_date`, `to_date` (optional)

### POST /api/admin/fees/expenses
Create new expense:
```json
{
  "category": "string",
  "description": "string",
  "amount": 1000.00,
  "expense_date": "2025-10-14",
  "payment_method": "bank_transfer",
  "payment_reference": "TXN123",
  "vendor_name": "ABC Corp",
  "vendor_contact": "9876543210",
  "receipt_url": "https://...",
  "notes": "Optional notes"
}
```

### PUT /api/admin/fees/expenses
Update expense status:
```json
{
  "expense_id": "uuid",
  "status": "approved" // or "paid", "rejected"
}
```

## Components

### AdminExpenseManagement
Main component for managing school expenses:
- Location: `web/src/components/fees/AdminExpenseManagement.tsx`
- Features:
  - Stats dashboard (Total, Pending, Paid amounts)
  - Expense table with filters
  - Create expense dialog with receipt upload
  - View expense details
  - Approve/Reject/Mark Paid actions

### Integration
Already integrated into:
- Admin Portal: Accounts > Expenses tab
- Path: `/school-admin/fees` → Accounts → Expenses

## Usage

### Creating Expense Types (One-time setup)
1. Go to: Settings > Expense Type
2. Click "New"
3. Add expense types like:
   - Utilities
   - Office Supplies
   - Maintenance
   - Insurance
   - Salaries
   - etc.

### Recording an Expense
1. Navigate to: Accounts > Expenses
2. Click "New Expense"
3. Fill in details:
   - Select Expense Type
   - Enter amount and date
   - Add vendor details
   - Upload receipt (optional)
   - Add description
4. Click "Create Expense"

### Approving Expenses
1. View pending expenses in table
2. Click eye icon to view details
3. Click green checkmark to approve
4. Or click red X to reject

### Marking as Paid
1. Filter by "Approved" status
2. Click "Mark Paid" button
3. Expense moves to "Paid" status

## Troubleshooting

### Error: "Failed to create expense"
- Ensure migration 0063 is applied
- Check that `school_expenses` table exists
- Verify `notes` column exists in table

### Receipt upload failing
- Ensure `expense-receipts` bucket exists
- Check bucket is public
- Verify storage policies are set correctly
- Check file size (max 5MB recommended)

### Expenses not showing
- Check schoolId is passed correctly to component
- Verify RLS policies allow access
- Check network tab for API errors

## Database Schema

```sql
school_expenses (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  expense_number VARCHAR(100),  -- Auto-generated: EXP-2025-000001
  category VARCHAR(100),         -- From expense_types
  subcategory VARCHAR(100),
  description TEXT,
  amount DECIMAL(10,2),
  expense_date DATE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(200),
  vendor_name VARCHAR(200),
  vendor_contact TEXT,
  receipt_url TEXT,              -- Storage URL
  receipt_file_name VARCHAR(255),
  expense_type_id UUID,          -- Links to expense_types
  approved_by UUID,
  processed_by UUID,
  status VARCHAR(20),            -- pending, approved, paid, rejected
  notes TEXT,                    -- Additional remarks
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## Next Steps

1. ✅ Apply migration 0063
2. ✅ Create `expense-receipts` storage bucket
3. ✅ Set up storage policies
4. ✅ Create expense types in admin panel
5. ✅ Test creating expense with receipt
6. ✅ Test approval workflow

## Notes
- Voucher numbers are auto-generated as `EXP-YEAR-XXXXXX`
- Receipts are optional but recommended for auditing
- All expenses require admin approval before payment
- Payment status tracking enables better cash flow management
