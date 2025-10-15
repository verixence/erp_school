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

// Use postgres client directly
import pg from 'pg';
const { Pool } = pg;

// Extract connection details from Supabase URL
const dbUrl = supabaseUrl.replace('https://', '').split('.')[0];
const connectionString = `postgresql://postgres.${dbUrl}:${serviceRoleKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Reading inventory migration file...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/0065_inventory_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying inventory management migration...');
    console.log('This will create 7 tables with RLS policies and triggers\n');

    const client = await pool.connect();

    try {
      await client.query(migrationSQL);

      console.log('✅ Migration applied successfully!\n');
      console.log('Created tables:');
      console.log('  ✓ inventory_categories');
      console.log('  ✓ inventory_items');
      console.log('  ✓ inventory_stock_transactions');
      console.log('  ✓ inventory_issuances');
      console.log('  ✓ inventory_maintenance');
      console.log('  ✓ inventory_purchase_orders');
      console.log('  ✓ inventory_purchase_order_items\n');
      console.log('🎉 Inventory management system is now ready to use!');
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Failed to apply migration:', error.message);
    console.error('\nPlease apply the migration manually:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Copy the content of db/migrations/0065_inventory_management_system.sql');
    console.error('4. Paste and run it in the SQL Editor');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
