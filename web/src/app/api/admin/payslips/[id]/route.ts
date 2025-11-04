import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - Get single payslip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('teacher_payslip_summary')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching payslip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payslip' },
      { status: 500 }
    );
  }
}

// PATCH - Update payslip
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    const {
      basic_salary,
      allowances,
      deductions,
      gross_salary,
      net_salary,
      payslip_url,
      notes,
      status
    } = body;

    const updateData: any = {};
    if (basic_salary !== undefined) updateData.basic_salary = basic_salary;
    if (allowances !== undefined) updateData.allowances = allowances;
    if (deductions !== undefined) updateData.deductions = deductions;
    if (gross_salary !== undefined) updateData.gross_salary = gross_salary;
    if (net_salary !== undefined) updateData.net_salary = net_salary;
    if (payslip_url !== undefined) updateData.payslip_url = payslip_url;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'sent' && !updateData.sent_at) {
        updateData.sent_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('teacher_payslips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating payslip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payslip' },
      { status: 500 }
    );
  }
}

// DELETE - Delete payslip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from('teacher_payslips')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting payslip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payslip' },
      { status: 500 }
    );
  }
}
