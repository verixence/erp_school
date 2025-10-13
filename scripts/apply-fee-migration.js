const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFeeMigration() {
  try {
    console.log('Applying fee management migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/migrations/0058_complete_fee_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: stmt });
          if (error) {
            console.warn(`Warning on statement ${i + 1}:`, error.message);
          }
        } catch (err) {
          console.warn(`Warning on statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('Fee management migration completed!');
    
    // Test that tables were created
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'school_expenses', 
        'bank_accounts', 
        'cheque_register', 
        'fee_invoices', 
        'fee_payments'
      ]);
    
    if (error) {
      console.error('Error checking tables:', error);
    } else {
      console.log('Created tables:', tables?.map(t => t.table_name) || []);
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyFeeMigration();