import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for bulk payment
const bulkPaymentSchema = z.object({
  payments: z.array(z.object({
    fee_demand_id: z.string(),
    student_id: z.string().uuid(),
    amount: z.number().positive(),
    payment_method: z.enum(['cash', 'cheque', 'online', 'card']),
    payment_date: z.string(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    fee_type: z.string().optional(),
    isNew: z.boolean().optional(),
    fee_structure_id: z.string().optional()
  }))
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
    const validatedData = bulkPaymentSchema.parse(body);
    const results = [];
    const errors = [];

    // Process each payment
    for (const payment of validatedData.payments) {
      try {
        // If this is a new demand, create it first
        if (payment.isNew) {
          // First, fetch the fee structure to get the correct amount
          const { data: feeStructure, error: feeStructureError } = await supabase
            .from('fee_structures')
            .select('amount')
            .eq('id', payment.fee_structure_id)
            .eq('school_id', schoolId)
            .single();

          if (feeStructureError || !feeStructure) {
            console.error('Error fetching fee structure:', feeStructureError);
            throw new Error(`Fee structure not found for ${payment.fee_type}`);
          }

          const demandResponse = await supabase
            .from('student_fee_demands')
            .insert({
              school_id: schoolId,
              student_id: payment.student_id,
              fee_structure_id: payment.fee_structure_id,
              academic_year: new Date().getFullYear().toString(),
              original_amount: feeStructure.amount,
              adjustment_type: 'discount',
              adjustment_amount: 0,
              adjustment_reason: '',
              demand_amount: feeStructure.amount,
              paid_amount: 0,
              balance_amount: feeStructure.amount,
              payment_status: 'pending'
            })
            .select()
            .single();

          if (demandResponse.error) {
            console.error('Error creating demand:', demandResponse.error);
            throw new Error(`Failed to create demand for ${payment.fee_type}: ${demandResponse.error.message}`);
          }

          // Update payment with new demand ID
          payment.fee_demand_id = demandResponse.data.id;
        }

        // Get the fee demand
        const { data: demand, error: demandError } = await supabase
          .from('student_fee_demands')
          .select('*')
          .eq('id', payment.fee_demand_id)
          .eq('school_id', schoolId)
          .single();

        if (demandError || !demand) {
          throw new Error(`Fee demand not found for ${payment.fee_type}`);
        }

        // Check if payment amount exceeds balance
        if (payment.amount > demand.balance_amount) {
          throw new Error(`Payment amount exceeds balance for ${payment.fee_type}`);
        }

        // Calculate new amounts
        const newPaidAmount = (demand.paid_amount || 0) + payment.amount;
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
          .eq('id', payment.fee_demand_id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update demand for ${payment.fee_type}`);
        }

        // Create payment transaction record (optional)
        await supabase
          .from('fee_payment_transactions')
          .insert({
            school_id: schoolId,
            student_id: payment.student_id,
            fee_demand_id: payment.fee_demand_id,
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date,
            reference_number: payment.reference_number,
            notes: payment.notes,
            status: 'completed'
          });

        results.push({
          fee_type: payment.fee_type,
          amount: payment.amount,
          success: true
        });

      } catch (error: any) {
        errors.push({
          fee_type: payment.fee_type,
          error: error.message
        });
      }
    }

    // Check if all payments failed
    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { error: 'All payments failed', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined,
      receipt_no: `RCP-${Date.now()}`,
      message: errors.length > 0
        ? `${results.length} payments succeeded, ${errors.length} failed`
        : 'All payments processed successfully'
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
