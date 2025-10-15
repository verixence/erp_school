# Inventory Management System Setup

## Database Migration Required

The inventory management system requires running a database migration to create the necessary tables.

### Migration File
`db/migrations/0065_inventory_management_system.sql`

### How to Apply the Migration

You can apply this migration using Supabase CLI or directly in the Supabase SQL Editor:

#### Option 1: Using Supabase SQL Editor (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the file `db/migrations/0065_inventory_management_system.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click "Run" to execute the migration

#### Option 2: Using Supabase CLI
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
