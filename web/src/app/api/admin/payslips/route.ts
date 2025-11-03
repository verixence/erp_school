import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - List all payslips for school
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Parse filters
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const teacherId = searchParams.get('teacher_id');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('teacher_payslip_summary')
      .select('*')
      .eq('school_id', userData.school_id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (month) query = query.eq('month', parseInt(month));
    if (year) query = query.eq('year', parseInt(year));
    if (teacherId) query = query.eq('teacher_id', teacherId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

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

// POST - Create new payslip
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.school_id || userData.role !== 'school_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const {
      teacher_id,
      month,
      year,
      basic_salary,
      allowances,
      deductions,
      gross_salary,
      net_salary,
      payslip_url,
      notes,
      send_now
    } = body;

    // Validate required fields
    if (!teacher_id || !month || !year || !gross_salary || !net_salary) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payslip
    const { data: payslip, error } = await supabase
      .from('teacher_payslips')
      .insert({
        school_id: userData.school_id,
        teacher_id,
        month,
        year,
        basic_salary: basic_salary || 0,
        allowances: allowances || {},
        deductions: deductions || {},
        gross_salary,
        net_salary,
        payslip_url,
        notes,
        status: send_now ? 'sent' : 'draft',
        sent_at: send_now ? new Date().toISOString() : null,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Payslip already exists for this month' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(payslip, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payslip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payslip' },
      { status: 500 }
    );
  }
}
