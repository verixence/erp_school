import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { from_section_id, to_section_id, copy_teachers = true } = await request.json();

    if (!from_section_id || !to_section_id) {
      return NextResponse.json(
        { error: 'Both from_section_id and to_section_id are required' },
        { status: 400 }
      );
    }

    if (from_section_id === to_section_id) {
      return NextResponse.json(
        { error: 'Cannot copy timetable to the same section' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient(request);

    // Call the PostgreSQL copy function
    const { data, error } = await supabase.rpc('copy_timetable', {
      p_from_section_id: from_section_id,
      p_to_section_id: to_section_id,
      p_copy_teachers: copy_teachers
    });

    if (error) {
      console.error('Copy timetable error:', error);
      return NextResponse.json(
        { error: 'Failed to copy timetable', details: error.message },
        { status: 500 }
      );
    }

    const result = data[0];
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      periods_copied: result.periods_copied
    });

  } catch (error) {
    console.error('Copy timetable API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 