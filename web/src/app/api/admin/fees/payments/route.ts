import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for payment recording
const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid('Valid invoice ID is required'),
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'cheque', 'dd']),
  payment_reference: z.string().optional(),
  payment_gateway_id: z.string().optional(),
  gateway_response: z.object({}).optional(),
  notes: z.string().optional(),
  processed_by: z.string().uuid().optional()
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
    const validatedData = recordPaymentSchema.parse(body);

    // Verify invoice exists and belongs to the school
    const { data: invoice, error: invoiceError } = await supabase
      .from('fee_invoices')
      .select('*')
      .eq('id', validatedData.invoice_id)
      .eq('school_id', schoolId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice is already fully paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already fully paid' },
        { status: 400 }
      );
    }

    // Check if payment amount exceeds due amount
    if (validatedData.amount > parseFloat(invoice.due_amount)) {
      return NextResponse.json(
        { error: 'Payment amount exceeds due amount' },
        { status: 400 }
      );
    }

    // Generate payment number
    const { data: paymentNumberData, error: paymentNumberError } = await supabase
      .rpc('generate_payment_number', { p_school_id: schoolId });

    if (paymentNumberError) {
      // Fallback to simple numbering if function doesn't exist
      const paymentNumber = `PAY-${Date.now()}`;
      console.log('Using fallback payment number:', paymentNumber);
    }

    const paymentNumber = paymentNumberData || `PAY-${Date.now()}`;

    // Create the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .insert({
        invoice_id: validatedData.invoice_id,
        payment_number: paymentNumber,
        amount: validatedData.amount,
        payment_method: validatedData.payment_method,
        payment_reference: validatedData.payment_reference,
        payment_gateway_id: validatedData.payment_gateway_id,
        gateway_response: validatedData.gateway_response,
        status: 'success', // Assuming manual payments are successful
        processed_by: validatedData.processed_by,
        processed_at: new Date().toISOString(),
        notes: validatedData.notes
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      );
    }

    // Update invoice payment status using the trigger function
    const { error: updateError } = await supabase
      .rpc('update_invoice_payment_status', { p_invoice_id: validatedData.invoice_id });

    if (updateError) {
      console.error('Error updating invoice status:', updateError);
      // The payment was created but status update failed
      // This should be handled by the trigger, but we'll continue
    }

    // Get updated invoice data
    const { data: updatedInvoice } = await supabase
      .from('fee_invoices')
      .select(`
        *,
        students (
          id,
          full_name,
          grade,
          section,
          admission_no
        )
      `)
      .eq('id', validatedData.invoice_id)
      .single();

    return NextResponse.json({
      data: {
        payment,
        updated_invoice: updatedInvoice
      }
    }, { status: 201 });

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

// GET /api/admin/fees/payments - List payments with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const invoiceId = searchParams.get('invoice_id');
    const studentId = searchParams.get('student_id');
    const paymentMethod = searchParams.get('payment_method');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('fee_payments')
      .select(`
        *,
        fee_invoices (
          id,
          invoice_number,
          academic_year,
          billing_period,
          students (
            id,
            full_name,
            grade,
            section,
            admission_no
          )
        )
      `, { count: 'exact' })
      .eq('fee_invoices.school_id', schoolId);

    // Apply filters
    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    if (studentId) {
      query = query.eq('fee_invoices.student_id', studentId);
    }

    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    if (toDate) {
      query = query.lte('created_at', toDate + 'T23:59:59.999Z');
    }

    const { data: payments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Get payment summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('fee_payments')
      .select('status, amount, payment_method, created_at')
      .eq('fee_invoices.school_id', schoolId);

    let summary = {
      total_payments: 0,
      total_amount: 0,
      successful_payments: 0,
      failed_payments: 0,
      pending_payments: 0,
      refunded_amount: 0,
      by_method: {} as Record<string, { count: number; amount: number }>
    };

    if (summaryData) {
      summary = summaryData.reduce((acc, payment) => {
        acc.total_payments++;
        const amount = parseFloat(payment.amount || '0');

        if (payment.status === 'success') {
          acc.successful_payments++;
          acc.total_amount += amount;
        } else if (payment.status === 'failed') {
          acc.failed_payments++;
        } else if (payment.status === 'pending') {
          acc.pending_payments++;
        } else if (payment.status === 'refunded') {
          acc.refunded_amount += amount;
        }

        // Group by payment method
        if (!acc.by_method[payment.payment_method]) {
          acc.by_method[payment.payment_method] = { count: 0, amount: 0 };
        }
        acc.by_method[payment.payment_method].count++;
        if (payment.status === 'success') {
          acc.by_method[payment.payment_method].amount += amount;
        }

        return acc;
      }, summary);
    }

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      summary
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}