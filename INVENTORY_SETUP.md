# Inventory Management System Setup

## ⚠️ Database Migration Required

The inventory management system requires running a database migration to create the necessary tables.

**Error you might see:**
```
{"error":"relation \"public.inventory_categories\" does not exist"}
```

This means the database tables haven't been created yet.

### Migration File
`db/migrations/0065_inventory_management_system.sql`

---

## 🚀 Quick Setup (4 Steps)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### Step 2: Copy the Migration SQL
1. Open the file: `db/migrations/0065_inventory_management_system.sql`
2. Copy **ALL** the content (Cmd/Ctrl + A, then Cmd/Ctrl + C)

### Step 3: Run the Migration
1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** (or press Cmd/Ctrl + Enter)
3. Wait for the "Success. No rows returned" message

### Step 4: Verify
1. Refresh your browser at `localhost:3001/school-admin/inventory`
2. The 500 errors should be gone
3. You should see the inventory dashboard

---

## Alternative Methods

### Option A: Using Helper Script
```bash
./apply-inventory-migration.sh
```

This will display the SQL and provide copy instructions.

### Option B: Using Supabase CLI (if installed)
```bash
supabase db push
```

### What the Migration Creates

The migration creates the following tables:

1. **inventory_categories** - For organizing items into categories
2. **inventory_items** - Main items table with stock tracking
3. **inventory_stock_transactions** - Transaction history for all stock movements
4. **inventory_issuances** - Track borrowed/issued items
5. **inventory_maintenance** - Maintenance and repair records
6. **inventory_purchase_orders** - Purchase order management
7. **inventory_purchase_order_items** - Line items for purchase orders

### Features Enabled

- ✅ Automatic stock updates via database triggers
- ✅ Row Level Security (RLS) for data protection
- ✅ Performance indexes for fast queries
- ✅ Real-time low stock alerts
- ✅ Overdue item tracking
- ✅ Complete transaction history

### After Migration

Once the migration is applied, the inventory management system will be fully functional at:
- **School Admin Portal** → **Inventory** (in the sidebar)

### Verification

You can verify the migration was successful by checking if the tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'inventory_%';
```

You should see 7 tables listed.
