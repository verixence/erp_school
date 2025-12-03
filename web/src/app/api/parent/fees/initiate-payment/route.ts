import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const paymentRequestSchema = z.object({
  student_id: z.string().uuid(),
  fee_demand_ids: z.array(z.string().uuid()).min(1),
  amount: z.number().positive(),
});

// POST /api/parent/fees/initiate-payment - Initiate a payment for fee demands
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = paymentRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { student_id, fee_demand_ids, amount } = validation.data;

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the user is a parent of this child
    const { data: parentRelation, error: relationError } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('student_id', student_id)
      .single();

    if (relationError || !parentRelation) {
      return NextResponse.json(
        { error: 'Unauthorized - You are not a parent of this student' },
        { status: 403 }
      );
    }

    // Get user's school
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get payment gateway settings
    const { data: gatewaySettings, error: gatewayError } = await supabase
      .from('payment_gateway_settings')
      .select('*')
      .eq('school_id', userData.school_id)
      .eq('is_enabled', true)
      .single();

    if (gatewayError || !gatewaySettings) {
      return NextResponse.json(
        { error: 'Payment gateway not enabled for this school' },
        { status: 400 }
      );
    }

    // Verify fee demands belong to the student and calculate total
    const { data: demands, error: demandsError } = await supabase
      .from('student_fee_demands')
      .select('*')
      .in('id', fee_demand_ids)
      .eq('student_id', student_id);

    if (demandsError || !demands || demands.length !== fee_demand_ids.length) {
      return NextResponse.json(
        { error: 'Invalid fee demands' },
        { status: 400 }
      );
    }

    // Calculate total balance
    const totalBalance = demands.reduce((sum, demand) => sum + Number(demand.balance_amount), 0);

    if (amount > totalBalance) {
      return NextResponse.json(
        { error: 'Payment amount exceeds total balance' },
        { status: 400 }
      );
    }

    // Calculate convenience fee
    let convenienceFee = 0;
    if (gatewaySettings.convenience_fee_bearer === 'parent') {
      if (gatewaySettings.convenience_fee_type === 'percentage') {
        convenienceFee = (amount * gatewaySettings.convenience_fee_value) / 100;
      } else {
        convenienceFee = gatewaySettings.convenience_fee_value;
      }
    }

    const totalAmount = amount + convenienceFee;

    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // TODO: Integrate with actual payment gateway (Razorpay/Stripe)
    // For now, we'll create a placeholder order
    const gatewayOrderId = `ORDER-${Date.now()}`;

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        school_id: userData.school_id,
        transaction_id: transactionId,
        gateway_order_id: gatewayOrderId,
        student_id,
        parent_id: user.id,
        fee_demand_ids,
        amount,
        convenience_fee: convenienceFee,
        total_amount: totalAmount,
        currency: gatewaySettings.currency,
        gateway_provider: gatewaySettings.gateway_provider,
        status: 'initiated'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create payment transaction' },
        { status: 500 }
      );
    }

    // Return payment order details
    // In production, this would include actual gateway order details
    return NextResponse.json({
      transaction_id: transactionId,
      gateway_order_id: gatewayOrderId,
      amount,
      convenience_fee: convenienceFee,
      total_amount: totalAmount,
      currency: gatewaySettings.currency,
      gateway_provider: gatewaySettings.gateway_provider,
      // In production, include gateway-specific keys like:
      // razorpay_key: gatewaySettings.api_key (for Razorpay)
      // stripe_publishable_key: gatewaySettings.api_key (for Stripe)
      payment_gateway_config: {
        provider: gatewaySettings.gateway_provider,
        api_key: gatewaySettings.api_key, // This would be the publishable key
        payment_modes: gatewaySettings.payment_modes
      }
    });
  } catch (error) {
    console.error('Error in POST /api/parent/fees/initiate-payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
