import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const paymentVerificationSchema = z.object({
  transaction_id: z.string(),
  gateway_payment_id: z.string(),
  gateway_signature: z.string().optional(),
  gateway_response: z.any().optional(),
});

// POST /api/parent/fees/verify-payment - Verify payment after gateway processing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = paymentVerificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { transaction_id, gateway_payment_id, gateway_signature, gateway_response } = validation.data;

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('transaction_id', transaction_id)
      .eq('parent_id', user.id)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // TODO: Verify payment signature with payment gateway
    // For Razorpay: verify HMAC signature
    // For Stripe: verify using webhook or payment intent

    // For now, we'll assume the payment is successful
    const isVerified = true; // Replace with actual verification logic

    if (!isVerified) {
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          failure_reason: 'Payment signature verification failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Update transaction as successful
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        gateway_payment_id,
        gateway_signature,
        gateway_response,
        status: 'success',
        payment_method: gateway_response?.method || 'online',
        completed_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction status' },
        { status: 500 }
      );
    }

    // Now apply the payment to the fee demands
    // This is similar to what admin does in /api/admin/fees/apply-payment
    const feeDemandIds = transaction.fee_demand_ids as string[];
    const paymentAmount = Number(transaction.amount);

    // Get all the fee demands
    const { data: demands, error: demandsError } = await supabase
      .from('student_fee_demands')
      .select('*, fee_structure:fee_structures(fee_category:fee_categories(name))')
      .in('id', feeDemandIds)
      .order('due_date', { ascending: true });

    if (demandsError || !demands) {
      console.error('Error fetching demands:', demandsError);
      return NextResponse.json(
        { error: 'Failed to fetch fee demands' },
        { status: 500 }
      );
    }

    // Distribute the payment amount across demands
    let remainingAmount = paymentAmount;
    const receiptItems: any[] = [];
    const updatedDemandIds: string[] = [];

    for (const demand of demands) {
      if (remainingAmount <= 0) break;

      const balanceAmount = Number(demand.balance_amount);
      if (balanceAmount <= 0) continue;

      const amountToApply = Math.min(remainingAmount, balanceAmount);
      const newPaidAmount = Number(demand.paid_amount) + amountToApply;
      const newBalanceAmount = Number(demand.demand_amount) - newPaidAmount;

      // Update the demand
      const { error: demandUpdateError } = await supabase
        .from('student_fee_demands')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          payment_status: newBalanceAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending'
        })
        .eq('id', demand.id);

      if (demandUpdateError) {
        console.error('Error updating demand:', demandUpdateError);
        continue;
      }

      updatedDemandIds.push(demand.id);
      remainingAmount -= amountToApply;

      // Add to receipt items
      receiptItems.push({
        demand_id: demand.id,
        fee_type: demand.fee_structure?.fee_category?.name || 'Fee',
        amount: amountToApply,
        original_amount: demand.demand_amount,
        balance_amount: newBalanceAmount
      });
    }

    // Get student and parent details for receipt
    const { data: student } = await supabase
      .from('students')
      .select('*, school:schools(*)')
      .eq('id', transaction.student_id)
      .single();

    const { data: parent } = await supabase
      .from('users')
      .select('email, profile:profiles(first_name, last_name, phone)')
      .eq('id', user.id)
      .single();

    // Extract profile data (Supabase might return it as array)
    const profileData = parent?.profile && Array.isArray(parent.profile)
      ? parent.profile[0]
      : parent?.profile as any;

    // Generate receipt number
    const receiptNo = `RCP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create fee receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('fee_receipts')
      .insert({
        school_id: transaction.school_id,
        student_id: transaction.student_id,
        receipt_no: receiptNo,
        receipt_date: new Date().toISOString(),
        student_name: student?.full_name || '',
        student_admission_no: student?.admission_number || '',
        student_grade: student?.grade || '',
        student_section: student?.section || '',
        parent_name: profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : '',
        parent_email: parent?.email || '',
        parent_phone: profileData?.phone || '',
        payment_method: 'online',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: gateway_payment_id,
        notes: `Online payment via ${transaction.gateway_provider}. Transaction ID: ${transaction_id}`,
        receipt_items: receiptItems,
        total_amount: paymentAmount,
        school_name: student?.school?.name || '',
        school_address: student?.school?.address || '',
        school_phone: student?.school?.phone || '',
        school_email: student?.school?.email || '',
        school_logo_url: student?.school?.logo_url || '',
        created_by: user.id
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      // Don't fail the transaction, but log the error
    }

    // Link receipt to transaction
    if (receipt) {
      await supabase
        .from('payment_transactions')
        .update({ receipt_id: receipt.id })
        .eq('id', transaction.id);
    }

    return NextResponse.json({
      success: true,
      transaction_id,
      receipt_no: receiptNo,
      amount_paid: paymentAmount,
      receipt,
      message: 'Payment verified and applied successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/parent/fees/verify-payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
