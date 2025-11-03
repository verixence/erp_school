import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST - Generate payslips for all teachers using their salary templates
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

    const { month, year, send_now, teacher_ids } = body;

    // Validate required fields
    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month or year' },
        { status: 400 }
      );
    }

    // Get active salary templates
    let query = supabase
      .from('teacher_salary_templates')
      .select('*')
      .eq('school_id', userData.school_id)
      .eq('is_active', true);

    // If specific teachers selected, filter by them
    if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0) {
      query = query.in('teacher_id', teacher_ids);
    }

    const { data: templates, error: templatesError } = await query;

    if (templatesError) throw templatesError;

    if (!templates || templates.length === 0) {
      return NextResponse.json(
        { error: 'No active salary templates found' },
        { status: 404 }
      );
    }

    // Generate payslips from templates
    const payslips = templates.map(template => {
      const gross = template.basic_salary +
        (template.hra || 0) +
        (template.da || 0) +
        (template.ta || 0) +
        (template.other_allowances || 0);

      const totalDeductions =
        (template.pf || 0) +
        (template.tax || 0) +
        (template.other_deductions || 0);

      const net = gross - totalDeductions;

      return {
        school_id: userData.school_id,
        teacher_id: template.teacher_id,
        month: parseInt(month),
        year: parseInt(year),
        basic_salary: template.basic_salary,
        allowances: {
          hra: template.hra || 0,
          da: template.da || 0,
          ta: template.ta || 0,
          other: template.other_allowances || 0
        },
        deductions: {
          pf: template.pf || 0,
          tax: template.tax || 0,
          other: template.other_deductions || 0
        },
        gross_salary: gross,
        net_salary: net,
        status: send_now ? 'sent' : 'draft',
        sent_at: send_now ? new Date().toISOString() : null,
        created_by: user.id
      };
    });

    // Insert payslips (skip duplicates)
    const { data, error } = await supabase
      .from('teacher_payslips')
      .upsert(payslips, {
        onConflict: 'school_id,teacher_id,month,year',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    return NextResponse.json({
      message: `Successfully generated ${data.length} payslips`,
      count: data.length,
      month,
      year
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error generating bulk payslips:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate payslips' },
      { status: 500 }
    );
  }
}
