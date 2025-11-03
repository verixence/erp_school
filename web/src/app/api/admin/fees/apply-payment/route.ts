import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for payment
const paymentSchema = z.object({
  fee_demand_id: z.string().uuid(),
  student_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['cash', 'cheque', 'online', 'card']),
  payment_date: z.string(),
  reference_number: z.string().optional(),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = paymentSchema.parse(body);

    // Get the fee demand with student and school details for receipt
    const { data: demand, error: demandError } = await supabase
      .from('student_fee_demands')
      .select(`
        *,
        students!inner (
          full_name,
          admission_no,
          grade,
          section,
          student_parents (
            users (
              first_name,
              last_name,
              phone,
              email
            )
          )
        ),
        fee_structures (
          fee_categories (
            name
          )
        )
      `)
      .eq('id', validatedData.fee_demand_id)
      .eq('school_id', schoolId)
      .eq('student_id', validatedData.student_id)
      .single();

    if (demandError || !demand) {
      return NextResponse.json(
        { error: 'Fee demand not found' },
        { status: 404 }
      );
    }

    // Get school details for receipt
    const { data: school } = await supabase
      .from('schools')
      .select('name, address, phone_number, email_address, logo_url')
      .eq('id', schoolId)
      .single();

    // Check if payment amount exceeds balance
    if (validatedData.amount > demand.balance_amount) {
      return NextResponse.json(
        { error: 'Payment amount exceeds balance amount' },
        { status: 400 }
      );
    }

    // Calculate new amounts
    const newPaidAmount = (demand.paid_amount || 0) + validatedData.amount;
    const newBalanceAmount = demand.demand_amount - newPaidAmount;
    const newPaymentStatus = newBalanceAmount <= 0 ? 'paid' :
                             newPaidAmount > 0 ? 'partial' : 'pending';

    // Update the fee demand
    const { data: updatedDemand, error: updateError } = await supabase
      .from('student_fee_demands')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.fee_demand_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating fee demand:', updateError);
      return NextResponse.json(
        { error: 'Failed to update fee demand' },
        { status: 500 }
      );
    }

    // Generate receipt number
    const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Get parent details
    const parent = demand.students?.student_parents?.[0]?.users;
    const parentName = parent ? `${parent.first_name} ${parent.last_name}` : '';
    const parentPhone = parent?.phone || '';
    const parentEmail = parent?.email || '';

    // Get fee category name
    const feeCategoryName = demand.fee_structures?.fee_categories?.name || 'Fee';

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from('fee_receipts')
      .insert({
        school_id: schoolId,
        student_id: validatedData.student_id,
        receipt_no: receiptNumber,
        receipt_date: new Date().toISOString(),
        student_name: demand.students?.full_name || 'Unknown',
        student_admission_no: demand.students?.admission_no || '',
        student_grade: demand.students?.grade || '',
        student_section: demand.students?.section || '',
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_email: parentEmail,
        payment_method: validatedData.payment_method,
        payment_date: validatedData.payment_date,
        reference_number: validatedData.reference_number || '',
        notes: validatedData.notes || '',
        receipt_items: [{
          description: feeCategoryName,
          amount: validatedData.amount
        }],
        total_amount: validatedData.amount,
        school_name: school?.name || '',
        school_address: school?.address || '',
        school_phone: school?.phone_number || '',
        school_email: school?.email_address || '',
        school_logo_url: school?.logo_url || ''
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      // Don't fail the payment if receipt creation fails
    }

    return NextResponse.json({
      success: true,
      data: updatedDemand,
      receipt: receipt,
      receipt_number: receiptNumber,
      message: 'Payment applied successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
