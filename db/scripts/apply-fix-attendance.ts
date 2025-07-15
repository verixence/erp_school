import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// Initialize Supabase client with service role
const supabase = createClient(
  'https://pyzdfteicahfzyuoxgwg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/0042_fix_attendance_pivot.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const sql of statements) {
      console.log('Executing SQL:', sql.substring(0, 100) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('Error executing SQL:', error);
        throw error;
      }
    }

    console.log('Migration applied successfully');
  } catch (error) {
    console.error('Failed to apply migration:', error);
    process.exit(1);
  }
}

applyMigration(); 