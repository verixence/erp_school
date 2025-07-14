import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    console.log('Starting database constraint fix...');

    // Step 1: Drop the existing constraint and add the updated one
    const { error: constraintError } = await supabaseAdmin
      .from('_dummy_table_for_sql_execution') // This won't work, we need another approach
      .select('1')
      .limit(1);

    // Since we can't execute DDL directly, let's try a different approach
    // We'll use the fact that Supabase allows schema modifications through the API
    
    // First, let's check if we can at least read from exam_groups
    const { data: testData, error: testError } = await supabaseAdmin
      .from('exam_groups')
      .select('exam_type')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Cannot access exam_groups table',
        details: testError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: 'Direct DDL execution not available',
      message: 'Please run the following SQL manually in Supabase dashboard:',
      sql: `
-- Drop existing constraint
ALTER TABLE public.exam_groups 
DROP CONSTRAINT IF EXISTS exam_groups_exam_type_check;

-- Add updated constraint
ALTER TABLE public.exam_groups 
ADD CONSTRAINT exam_groups_exam_type_check 
CHECK (exam_type IN (
  'monthly', 'quarterly', 'half_yearly', 'annual', 'unit_test', 'other',
  'cbse_fa1', 'cbse_fa2', 'cbse_sa1', 'cbse_fa3', 'cbse_fa4', 'cbse_sa2'
));

-- Add CBSE columns
ALTER TABLE public.exam_groups 
ADD COLUMN IF NOT EXISTS cbse_term text CHECK (cbse_term IN ('Term1', 'Term2')),
ADD COLUMN IF NOT EXISTS cbse_exam_type text CHECK (cbse_exam_type IN ('FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'));
      `
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 