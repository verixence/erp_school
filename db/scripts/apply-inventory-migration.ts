import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from web/.env.local
dotenv.config({ path: path.join(__dirname, '../../web/.env.local') });

// Initialize Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('Reading inventory migration file...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/0065_inventory_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying inventory management migration...');
    console.log('This will create 7 tables with RLS policies and triggers');

    // Execute the entire migration as one SQL block
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('Error executing migration:', error);
      throw error;
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nCreated tables:');
    console.log('  - inventory_categories');
    console.log('  - inventory_items');
    console.log('  - inventory_stock_transactions');
    console.log('  - inventory_issuances');
    console.log('  - inventory_maintenance');
    console.log('  - inventory_purchase_orders');
    console.log('  - inventory_purchase_order_items');
    console.log('\nInventory management is now ready to use!');

  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    console.error('\nIf you see "function exec_sql does not exist", you need to apply the migration manually:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Copy the content of db/migrations/0065_inventory_management_system.sql');
    console.error('4. Paste and run it in the SQL Editor');
    process.exit(1);
  }
}

applyMigration();
