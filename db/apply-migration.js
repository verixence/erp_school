#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: './web/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPA_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPA_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read migration file
const migrationSQL = fs.readFileSync('./db/migrations/0070_exam_scheduling_constraints.sql', 'utf8');

console.log('📦 Applying migration: 0070_exam_scheduling_constraints.sql');
console.log('🔗 Target:', SUPABASE_URL);
console.log('');

// Apply migration using Supabase SQL Editor API endpoint
const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);

const options = {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  }
};

const data = JSON.stringify({ query: migrationSQL });

const req = https.request(url, options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
      console.log('✅ Migration applied successfully!');
      console.log('');
      console.log('📋 Summary of changes:');
      console.log('  1. ✅ Added UNIQUE constraint to prevent duplicate subjects');
      console.log('  2. ✅ Added performance indexes for conflict checking');
      console.log('  3. ✅ Added CHECK constraints for data validation');
      console.log('  4. ✅ Added trigger to validate exam dates');
      console.log('  5. ✅ Created conflicts logging table');
      console.log('  6. ✅ Set up RLS policies and permissions');
    } else {
      console.error('❌ Migration failed with status:', res.statusCode);
      console.error('Response:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(data);
req.end();
