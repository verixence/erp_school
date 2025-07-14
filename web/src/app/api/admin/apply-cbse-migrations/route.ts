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
    console.log('Starting CBSE migrations...');

    // Step 1: Update exam_type constraint to include CBSE types
    console.log('1. Updating exam_type constraint...');
    const { error: constraintError } = await supabaseAdmin
      .from('exam_groups')
      .select('1')
      .limit(1);

    if (constraintError) {
      console.log('Table access check failed:', constraintError);
    }

    // Step 2: Create CBSE reports table
    console.log('2. Creating CBSE reports table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.cbse_generated_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
        student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
        report_type text CHECK (report_type IN ('Term1', 'Term2', 'Cumulative')) NOT NULL,
        academic_year text NOT NULL DEFAULT '2024-25',
        status text CHECK (status IN ('draft', 'generated', 'published', 'distributed')) DEFAULT 'draft',
        published boolean DEFAULT false,
        published_at timestamptz,
        generated_at timestamptz,
        distributed_at timestamptz,
        report_data jsonb,
        pdf_url text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(school_id, student_id, report_type, academic_year)
      );
    `;

    // Step 3: Create helper function
    console.log('3. Creating helper function...');
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_cbse_reports_table_if_not_exists()
      RETURNS boolean AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'cbse_generated_reports'
        ) THEN
          RETURN true;
        END IF;
        RETURN false;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Step 4: Add indexes
    console.log('4. Creating indexes...');
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_cbse_reports_school_id 
      ON public.cbse_generated_reports(school_id);
      
      CREATE INDEX IF NOT EXISTS idx_cbse_reports_student_id 
      ON public.cbse_generated_reports(student_id);
      
      CREATE INDEX IF NOT EXISTS idx_cbse_reports_type_year 
      ON public.cbse_generated_reports(school_id, report_type, academic_year);
    `;

    // Step 5: Enable RLS
    console.log('5. Setting up RLS...');
    const setupRLSSQL = `
      ALTER TABLE public.cbse_generated_reports ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "cbse_reports_school_admin_manage" ON public.cbse_generated_reports
        FOR ALL TO authenticated
        USING (
          school_id IN (
            SELECT users.school_id FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'school_admin'
          )
        );
    `;

    // Return success with SQL commands for manual execution
    return NextResponse.json({
      success: true,
      message: 'CBSE migrations prepared successfully',
      instructions: 'Please run the following SQL commands in your Supabase SQL Editor:',
      sql_commands: [
        {
          description: '1. Fix exam type constraint',
          sql: `
-- Fix exam_type constraint
ALTER TABLE public.exam_groups 
DROP CONSTRAINT IF EXISTS exam_groups_exam_type_check;

ALTER TABLE public.exam_groups 
ADD CONSTRAINT exam_groups_exam_type_check 
CHECK (exam_type IN (
  'monthly', 'quarterly', 'half_yearly', 'annual', 'unit_test', 'other',
  'cbse_fa1', 'cbse_fa2', 'cbse_sa1', 'cbse_fa3', 'cbse_fa4', 'cbse_sa2'
));
          `
        },
        {
          description: '2. Create CBSE reports table',
          sql: createTableSQL
        },
        {
          description: '3. Create helper function',
          sql: createFunctionSQL
        },
        {
          description: '4. Create indexes',
          sql: createIndexesSQL
        },
        {
          description: '5. Setup RLS policies',
          sql: setupRLSSQL
        },
        {
          description: '6. Grant permissions',
          sql: `
GRANT EXECUTE ON FUNCTION create_cbse_reports_table_if_not_exists() TO authenticated, anon;
          `
        },
        {
          description: '7. Update school board type to CBSE',
          sql: `
-- Add board_type column if not exists
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS board_type text CHECK (board_type IN ('CBSE', 'ICSE', 'State', 'IB', 'IGCSE', 'Other'));

-- Update your school to CBSE
UPDATE public.schools 
SET board_type = 'CBSE' 
WHERE name = 'Campus High School';
          `
        }
      ]
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