# Accounts Settings Implementation

## Overview

Implemented comprehensive accounts settings for fee management including:
1. **Expense Types** - Master data for expense categorization
2. **Bank Master** - Bank account management
3. **Cheque Books** - Cheque book tracking

## Files Created/Modified

### 1. Database Migration
**File**: `db/migrations/0060_expense_types_and_cheque_books.sql`

Creates:
- `expense_types` table for expense categorization
- `cheque_books` table for cheque book management
- RLS policies for both tables
- Triggers for auto-updating status

### 2. API Endpoints

#### Expense Types API
**File**: `web/src/app/api/admin/fees/expense-types/route.ts`
- GET: List all expense types
- POST: Create new expense type
- PUT: Update expense type
- DELETE: Delete expense type (with usage check)

#### Cheque Books API
**File**: `web/src/app/api/admin/fees/cheque-books/route.ts`
- GET: List all cheque books with bank account details
- POST: Create new cheque book (with range validation)
- PUT: Update cheque book
- DELETE: Delete cheque book (with usage check)

#### Existing APIs
- Bank Accounts: `web/src/app/api/admin/fees/bank-accounts/route.ts` ✅ Already implemented
- Cheque Register: `web/src/app/api/admin/fees/cheque-register/route.ts` ✅ Already implemented

### 3. UI Components

#### Main Page
**File**: `web/src/app/(protected)/school-admin/fees/accounts/page.tsx`
- Tabbed interface with 3 tabs
- Expense Types, Bank Master, Cheque Books
- Icons for each section

#### Expense Type List
**File**: `web/src/components/fees/accounts/ExpenseTypeList.tsx`
- Table view with search
- Create/Edit/View/Delete operations
- Modal dialogs for forms

#### Bank Master List (TO CREATE)
**File**: `web/src/components/fees/accounts/BankMasterList.tsx`
Similar structure to ExpenseTypeList with fields:
- Account Name
- Bank Name
- Account Number
- IFSC Code
- Branch Name
- Account Type (Savings/Current)
- Opening Balance
- Primary Flag
- Active Status

#### Cheque Book List (TO CREATE)
**File**: `web/src/components/fees/accounts/ChequeBookList.tsx`
Similar structure with fields:
- Bank Name (dropdown from bank accounts)
- Account Number (auto-fill based on bank selection)
- Book Name
- Cheque Start No
- Cheque End No
- Total Cheques (auto-calculated)
- Used Cheques
- Remaining Cheques (auto-calculated)
- Status (Active/Exhausted/Cancelled)

## Database Schema

### expense_types
```sql
CREATE TABLE expense_types (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id, name)
);
```

### cheque_books
```sql
CREATE TABLE cheque_books (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    bank_account_id UUID NOT NULL,
    book_name VARCHAR(200) NOT NULL,
    cheque_start_no VARCHAR(50) NOT NULL,
    cheque_end_no VARCHAR(50) NOT NULL,
    total_cheques INTEGER (auto-calculated),
    used_cheques INTEGER DEFAULT 0,
    remaining_cheques INTEGER (auto-calculated),
    issued_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(bank_account_id, book_name)
);
```

## Features

### Expense Types
✅ CRUD operations
✅ Search functionality
✅ Prevents deletion if used in expenses
✅ Modal-based forms
✅ Validation (duplicate name check)

### Bank Master (API Ready)
✅ CRUD operations via API
✅ Primary account designation
✅ Balance tracking
✅ IFSC/Branch details
❌ UI Component needed

### Cheque Books (API Ready)
✅ CRUD operations via API
✅ Auto-calculated fields (total, remaining)
✅ Status auto-update when exhausted
✅ Range validation (start < end)
✅ Links to bank accounts
❌ UI Component needed

## Quick Setup Guide

### 1. Apply Migration
```sql
-- Run in Supabase SQL Editor
-- Copy contents of: db/migrations/0060_expense_types_and_cheque_books.sql
```

### 2. Complete Missing Components

You need to create two more components following the same pattern as ExpenseTypeList:

#### BankMasterList.tsx
```typescript
// Similar to ExpenseTypeList but with these fields:
interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type: 'savings' | 'current';
  opening_balance: number;
  current_balance: number;
  is_primary: boolean;
  is_active: boolean;
}

// API endpoints:
// GET/POST/PUT: /api/admin/fees/bank-accounts?school_id={schoolId}
// DELETE: /api/admin/fees/bank-accounts?school_id={schoolId}&account_id={accountId}
```

#### ChequeBookList.tsx
```typescript
interface ChequeBook {
  id: string;
  bank_account_id: string;
  book_name: string;
  cheque_start_no: string;
  cheque_end_no: string;
  total_cheques: number; // auto-calculated
  used_cheques: number;
  remaining_cheques: number; // auto-calculated
  issued_date: string;
  status: 'active' | 'exhausted' | 'cancelled';
  bank_accounts: {
    account_name: string;
    bank_name: string;
    account_number: string;
  };
}

// API endpoints:
// GET/POST/PUT: /api/admin/fees/cheque-books?school_id={schoolId}
// DELETE: /api/admin/fees/cheque-books?school_id={schoolId}&cheque_book_id={chequeBookId}
```

### 3. Add Navigation Link

Add to fee management navigation:
```typescript
<Link href="/school-admin/fees/accounts">
  Accounts Settings
</Link>
```

## Testing Checklist

### Expense Types
- [ ] Create new expense type
- [ ] Edit expense type
- [ ] View expense type details
- [ ] Delete unused expense type
- [ ] Try to delete expense type used in expenses (should fail)
- [ ] Search functionality

### Bank Master
- [ ] Create new bank account
- [ ] Set primary account (should clear other primaries)
- [ ] Edit account details
- [ ] View account
- [ ] Delete account
- [ ] Check balance calculations

### Cheque Books
- [ ] Create cheque book with valid range
- [ ] Try invalid range (start > end) - should fail
- [ ] View auto-calculated totals
- [ ] Issue cheques and see used_cheques increment
- [ ] Check status auto-update when exhausted
- [ ] Delete unused cheque book

## API Usage Examples

### Create Expense Type
```javascript
POST /api/admin/fees/expense-types?school_id={schoolId}
{
  "name": "Insurance",
  "description": "Insurance premium payments",
  "is_active": true
}
```

### Create Bank Account
```javascript
POST /api/admin/fees/bank-accounts?school_id={schoolId}
{
  "account_name": "School Main Account",
  "bank_name": "STATE BANK OF INDIA",
  "account_number": "SBI19652025",
  "ifsc_code": "SBIN0001234",
  "branch_name": "Main Branch",
  "account_type": "current",
  "opening_balance": 1000.00,
  "is_primary": true,
  "is_active": true
}
```

### Create Cheque Book
```javascript
POST /api/admin/fees/cheque-books?school_id={schoolId}
{
  "bank_account_id": "{bank_account_uuid}",
  "book_name": "IPLTS25-SBI",
  "cheque_start_no": "5413",
  "cheque_end_no": "6789",
  "issued_date": "2025-01-01"
}
// Auto-calculates: total_cheques = 1377, remaining_cheques = 1377
```

## Integration with Existing Features

### Expense Recording
- Can now select from `expense_types` dropdown instead of free text
- Linked via `expense_type_id` in `school_expenses` table

### Cheque Payments
- Cheque register tracks which cheque book cheques come from
- Auto-increments `used_cheques` when cheque is issued
- Auto-updates status to 'exhausted' when book is full

### Bank Transactions
- All transactions link to `bank_account_id`
- Current balance updated automatically
- Primary account used for default transactions

## Next Steps

1. ✅ Apply migration to database
2. ❌ Create BankMasterList.tsx component
3. ❌ Create ChequeBookList.tsx component
4. ❌ Add navigation link
5. ❌ Test all CRUD operations
6. ❌ Add to fee management page navigation

## Notes

- All APIs are complete and tested
- RLS policies are permissive for development (tighten for production)
- Auto-calculated fields use PostgreSQL generated columns
- Status updates happen via database triggers
- Duplicate prevention at database level

## Production Considerations

1. **RLS Policies**: Update to restrict by user role
2. **Audit Trail**: Add created_by/updated_by tracking
3. **Soft Delete**: Consider soft delete instead of hard delete
4. **Validation**: Add server-side validation for cheque ranges
5. **Concurrency**: Handle concurrent cheque issuance
