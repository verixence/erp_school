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

    // Get the fee demand
    const { data: demand, error: demandError } = await supabase
      .from('student_fee_demands')
      .select('*')
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

    // Create payment transaction record (optional - for audit trail)
    const { error: transactionError } = await supabase
      .from('fee_payment_transactions')
      .insert({
        school_id: schoolId,
        student_id: validatedData.student_id,
        fee_demand_id: validatedData.fee_demand_id,
        amount: validatedData.amount,
        payment_method: validatedData.payment_method,
        payment_date: validatedData.payment_date,
        reference_number: validatedData.reference_number,
        notes: validatedData.notes,
        status: 'completed'
      });

    // Don't fail if transaction table doesn't exist - it's optional
    if (transactionError) {
      console.warn('Could not create transaction record:', transactionError);
    }

    return NextResponse.json({
      success: true,
      data: updatedDemand,
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
