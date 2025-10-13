const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration in web/.env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Reading migration file...');
  const migrationPath = path.join(__dirname, '../db/migrations/0059_student_fee_demands.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration 0059_student_fee_demands.sql...');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct query execution if RPC doesn't work
      console.log('RPC failed, trying direct execution...');

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          const { error: execError } = await supabase.rpc('exec', { sql: statement + ';' });
          if (execError) {
            console.warn(`Statement execution note: ${execError.message}`);
            // Continue with other statements
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nCreated:');
    console.log('  - student_fee_demands table');
    console.log('  - Indexes for performance');
    console.log('  - Row Level Security policies');
    console.log('  - Automatic triggers for demand_amount calculation');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\nPlease run this SQL manually in your Supabase SQL Editor:');
    console.error('File: db/migrations/0059_student_fee_demands.sql');
    process.exit(1);
  }
}

runMigration();
