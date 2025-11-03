import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - List all salary templates for school
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Salary templates GET - Auth user:', user?.id, 'Error:', authError);
    if (!user) {
      console.log('No user found in salary templates GET');
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

    // Get all templates with teacher details
    const { data, error } = await supabase
      .from('teacher_salary_template_summary')
      .select('*')
      .eq('school_id', userData.school_id)
      .order('teacher_name');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching salary templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch salary templates' },
      { status: 500 }
    );
  }
}

// POST - Create or update salary template
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
      basic_salary,
      hra,
      da,
      ta,
      other_allowances,
      pf,
      tax,
      other_deductions,
      is_active
    } = body;

    // Validate required fields
    if (!teacher_id || basic_salary === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert template (insert or update if exists)
    const { data: template, error } = await supabase
      .from('teacher_salary_templates')
      .upsert({
        school_id: userData.school_id,
        teacher_id,
        basic_salary: basic_salary || 0,
        hra: hra || 0,
        da: da || 0,
        ta: ta || 0,
        other_allowances: other_allowances || 0,
        pf: pf || 0,
        tax: tax || 0,
        other_deductions: other_deductions || 0,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'school_id,teacher_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('Error saving salary template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save salary template' },
      { status: 500 }
    );
  }
}
