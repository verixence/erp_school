import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Test endpoint to check school_expenses table schema
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Try to check the table structure
    const { data: testData, error: testError } = await supabase
      .from('school_expenses')
      .select('*')
      .limit(1);

    // Get column information if possible
    const { data: columnData, error: columnError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'school_expenses'
          ORDER BY ordinal_position;
        `
      })
      .single();

    return NextResponse.json({
      success: true,
      tableExists: !testError,
      testError: testError ? {
        message: testError.message,
        code: testError.code,
        hint: testError.hint,
        details: testError.details
      } : null,
      sampleData: testData,
      columnInfo: columnData || 'Unable to fetch column info'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
