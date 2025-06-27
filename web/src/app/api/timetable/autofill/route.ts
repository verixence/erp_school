import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { section_id, replace_existing = false } = await request.json();

    if (!section_id) {
      return NextResponse.json(
        { error: 'Section ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Call the PostgreSQL autofill function
    const { data, error } = await supabase.rpc('autofill_timetable', {
      p_section_id: section_id,
      p_replace_existing: replace_existing
    });

    if (error) {
      console.error('Autofill error:', error);
      return NextResponse.json(
        { error: 'Failed to auto-fill timetable', details: error.message },
        { status: 500 }
      );
    }

    const result = data[0];
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      periods_filled: result.periods_filled,
      total_periods: result.total_periods,
      unassigned_subjects: result.unassigned_subjects,
      success_rate: result.total_periods > 0 
        ? ((result.periods_filled / result.total_periods) * 100).toFixed(1)
        : '0'
    });

  } catch (error) {
    console.error('Auto-fill API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 