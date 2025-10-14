# Expense Claims System Implementation

## Overview
A complete expense claims system where teachers/staff can submit expense reimbursement claims with receipts, and school admins can review, approve/reject, and track payments.

## Components Implemented

### 1. Database Schema
**File**: `db/migrations/0062_expense_claims_system.sql`

**Table**: `expense_claims`
- Employee details (name, ID, department)
- Claim details (dates, category, amount, description)
- Receipt upload (URL, filename)
- Bank details for reimbursement
- Approval workflow (status, reviewer, notes, approved amount)
- Payment tracking (payment reference, date, notes)

**Status Flow**:
- `pending` → submitted by teacher
- `under_review` → being reviewed by admin
- `approved` → admin approved
- `rejected` → admin rejected
- `paid` → payment completed

**Storage**: Created `expense-receipts` bucket for file uploads

### 2. API Routes
**File**: `web/src/app/api/admin/fees/claims/route.ts`

**Endpoints**:
- `GET /api/admin/fees/claims` - List all claims (with filters)
- `POST /api/admin/fees/claims` - Submit new claim (teacher)
- `PATCH /api/admin/fees/claims` - Update claim status (admin approve/reject/pay)

**Features**:
- Query by status, user_id
- Joins with users, expense_types
- Validation using Zod
- Audit trail tracking

### 3. Teacher UI Component
**File**: `web/src/components/fees/ExpenseClaimForm.tsx`

**Features**:
- Submit new expense claims
- Upload receipt files (JPG, PNG, PDF - max 5MB)
- Track claim status
- View claim history
- See approval/rejection details
- Provide bank account details

**Form Fields**:
- Employee name, ID, department
- Claim date, expense date
- Category (transport, meals, supplies, accommodation, other)
- Amount, description
- Receipt upload
- Bank details (bank name, account number, IFSC)

**UI Features**:
- Status badges (pending, approved, rejected, paid)
- View claim details dialog
- Receipt preview/download
- Real-time file upload feedback

### 4. Admin UI Component
**File**: `web/src/components/fees/AdminExpenseClaims.tsx`

**Features**:
- Dashboard with statistics (total claims, pending, approved, total amount)
- Filter claims by status
- Review and approve/reject claims
- Adjust approved amount
- Mark claims as paid
- View receipts and employee details

**Admin Actions**:
- **Approve**: Set approved amount, add review notes
- **Reject**: Provide rejection reason
- **Mark Paid**: Add payment reference and notes

**UI Features**:
- Stats cards showing key metrics
- Status filter dropdown
- Action buttons for each claim
- Review dialog with claim details
- Payment dialog with bank details

### 5. Teacher Page
**File**: `web/src/app/teacher/expense-claims/page.tsx`

**Features**:
- Full page for expense claims
- Instructions on how to submit claims
- Integration with ExpenseClaimForm component
- Back navigation to teacher dashboard

**Added to Teacher Dashboard**:
- New "Expense Claims" quick action card
- Icon: Receipt
- Color: Cyan gradient

### 6. Admin Integration
**File**: `web/src/app/(protected)/school-admin/fees/page.tsx`

**Integration**:
- Added to existing "Claim" tab in Accounts section
- Replaces placeholder with AdminExpenseClaims component
- Accessible via: Fee Management → Accounts → Claim tab

## File Upload System

### Storage Bucket
- **Name**: `expense-receipts`
- **Access**: Public read, authenticated write
- **Structure**: `{school_id}/{timestamp}_{filename}`

### Validation
- **Max Size**: 5MB
- **Allowed Types**: JPG, PNG, PDF
- **Naming**: Timestamped to avoid conflicts

### Security
- RLS policies for authenticated users
- File access tied to school_id
- Public URLs for receipt viewing

## Usage Flow

### Teacher Workflow
1. Navigate to "Expense Claims" from dashboard
2. Click "New Claim" button
3. Fill in expense details:
   - Employee information
   - Expense date and category
   - Amount and description
   - Upload receipt
   - Provide bank details
4. Submit claim
5. Track status in "My Expense Claims" table
6. View approval/rejection details

### Admin Workflow
1. Go to Fee Management → Accounts → Claim
2. View dashboard statistics
3. Filter claims by status (pending, approved, etc.)
4. Review claim details:
   - Employee information
   - Expense details
   - View uploaded receipt
5. Take action:
   - **Approve**: Confirm or adjust amount, add notes
   - **Reject**: Provide detailed rejection reason
6. For approved claims:
   - Mark as paid with payment reference
   - Add payment notes

## Database Fields Reference

### expense_claims table
```sql
- id (UUID, primary key)
- school_id (UUID, foreign key)
- user_id (UUID, foreign key)
- employee_name (VARCHAR)
- employee_id (VARCHAR)
- department (VARCHAR)
- claim_date (DATE)
- expense_date (DATE)
- expense_type_id (UUID, nullable)
- expense_category (VARCHAR) - transport/meals/supplies/accommodation/other
- description (TEXT)
- amount (DECIMAL)
- receipt_url (TEXT)
- receipt_file_name (VARCHAR)
- payment_method (VARCHAR)
- bank_account_number (VARCHAR)
- bank_name (VARCHAR)
- ifsc_code (VARCHAR)
- status (VARCHAR) - pending/under_review/approved/rejected/paid
- reviewed_by (UUID, nullable)
- reviewed_at (TIMESTAMPTZ)
- review_notes (TEXT)
- approved_amount (DECIMAL)
- rejection_reason (TEXT)
- paid_by (UUID, nullable)
- paid_at (TIMESTAMPTZ)
- payment_reference (VARCHAR)
- payment_notes (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## Navigation Paths

### Teacher
- Dashboard: `/teacher`
- Expense Claims: `/teacher/expense-claims`

### Admin
- Fee Management: `/school-admin/fees`
- Accounts Section: Click "Accounts" tab
- Claims: Click "Claim" tab

## Features Summary

✅ **Complete CRUD operations** for expense claims
✅ **File upload** with validation and storage
✅ **Approval workflow** with status tracking
✅ **Bank details** capture for reimbursement
✅ **Admin dashboard** with statistics
✅ **Status filters** for easy management
✅ **Receipt viewing** and download
✅ **Audit trail** (who reviewed, when, payment details)
✅ **Flexible approval** (admin can adjust amounts)
✅ **Payment tracking** with references
✅ **Responsive UI** with proper loading states
✅ **Error handling** and validation

## Testing Checklist

### Teacher Side
- [ ] Submit a new expense claim
- [ ] Upload different file types (JPG, PNG, PDF)
- [ ] Test file size validation (>5MB)
- [ ] View claim history
- [ ] See claim status updates
- [ ] View approval/rejection details

### Admin Side
- [ ] View all claims
- [ ] Filter by status
- [ ] Approve a claim (same amount)
- [ ] Approve a claim (different amount)
- [ ] Reject a claim with reason
- [ ] Mark approved claim as paid
- [ ] View uploaded receipts
- [ ] Check dashboard statistics

## Future Enhancements

1. **Email Notifications**
   - Notify teachers when claim status changes
   - Notify admins of new claims

2. **Expense Reports**
   - Monthly expense reports
   - Category-wise analytics
   - Export to Excel/PDF

3. **Bulk Actions**
   - Approve/reject multiple claims
   - Bulk payment marking

4. **Advanced Filters**
   - Date range filter
   - Amount range filter
   - Employee filter

5. **Comments/Discussion**
   - Back-and-forth communication on claims
   - Request additional documentation

6. **Integration with Accounting**
   - Link to bank accounts
   - Integration with cheque books
   - Automatic payment tracking

## Deployment Notes

- Ensure Supabase storage bucket is created
- Run migration 0062_expense_claims_system.sql
- Set up RLS policies for storage
- Test file upload permissions
- Configure email templates (if notifications added)

## Support

For issues or questions:
1. Check database migration is applied
2. Verify storage bucket exists
3. Check RLS policies are enabled
4. Review API error logs
5. Test file upload permissions
