import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - Get teacher's own payslips
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a teacher
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get payslips
    const { data, error } = await supabase
      .from('teacher_payslips')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('status', 'sent') // Only show sent payslips
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching payslips:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payslips' },
      { status: 500 }
    );
  }
}
