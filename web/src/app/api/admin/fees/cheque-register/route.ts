import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for cheque entry
const chequeSchema = z.object({
  bank_account_id: z.string().uuid('Valid bank account ID is required'),
  cheque_number: z.string().min(1, 'Cheque number is required'),
  cheque_date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date'),
  payee_name: z.string().min(1, 'Payee name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  purpose: z.string().optional(),
  payment_id: z.string().uuid().optional(),
  expense_id: z.string().uuid().optional(),
  issued_by: z.string().uuid().optional()
});

// GET /api/admin/fees/cheque-register - List cheques
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const bankAccountId = searchParams.get('bank_account_id');
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
      .from('cheque_register')
      .select(`
        *,
        bank_accounts (
          id,
          account_name,
          bank_name,
          account_number
        ),
        issued_by_user:issued_by (
          id,
          email,
          full_name
        ),
        fee_payments (
          id,
          payment_number,
          amount
        ),
        school_expenses (
          id,
          expense_number,
          description
        )
      `, { count: 'exact' })
      .eq('school_id', schoolId);

    // Apply filters
    if (bankAccountId) {
      query = query.eq('bank_account_id', bankAccountId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (fromDate) {
      query = query.gte('cheque_date', fromDate);
    }

    if (toDate) {
      query = query.lte('cheque_date', toDate);
    }

    const { data: cheques, error, count } = await query
      .order('cheque_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching cheques:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cheques' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('cheque_register')
      .select('status, amount, cheque_date')
      .eq('school_id', schoolId);

    let summary = {
      total_cheques: 0,
      total_amount: 0,
      issued_count: 0,
      cleared_count: 0,
      bounced_count: 0,
      cancelled_count: 0,
      pending_count: 0,
      by_status: {} as Record<string, { count: number; amount: number }>
    };

    if (summaryData) {
      summary = summaryData.reduce((acc, cheque) => {
        acc.total_cheques++;
        const amount = parseFloat(cheque.amount || '0');
        acc.total_amount += amount;

        // Status counts
        switch (cheque.status) {
          case 'issued':
            acc.issued_count++;
            break;
          case 'cleared':
            acc.cleared_count++;
            break;
          case 'bounced':
            acc.bounced_count++;
            break;
          case 'cancelled':
            acc.cancelled_count++;
            break;
          case 'pending':
            acc.pending_count++;
            break;
        }

        // Status-wise breakdown
        if (!acc.by_status[cheque.status]) {
          acc.by_status[cheque.status] = { count: 0, amount: 0 };
        }
        acc.by_status[cheque.status].count++;
        acc.by_status[cheque.status].amount += amount;

        return acc;
      }, summary);
    }

    return NextResponse.json({
      data: cheques,
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

// POST /api/admin/fees/cheque-register - Issue new cheque
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
    const validatedData = chequeSchema.parse(body);

    // Verify bank account belongs to school
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('id', validatedData.bank_account_id)
      .eq('school_id', schoolId)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Check for duplicate cheque number
    const { data: existingCheque } = await supabase
      .from('cheque_register')
      .select('id')
      .eq('bank_account_id', validatedData.bank_account_id)
      .eq('cheque_number', validatedData.cheque_number)
      .single();

    if (existingCheque) {
      return NextResponse.json(
        { error: 'A cheque with this number already exists for this account' },
        { status: 409 }
      );
    }

    // Create the cheque record
    const { data: cheque, error } = await supabase
      .from('cheque_register')
      .insert({
        school_id: schoolId,
        ...validatedData,
        status: 'issued'
      })
      .select(`
        *,
        bank_accounts (
          id,
          account_name,
          bank_name,
          account_number
        ),
        issued_by_user:issued_by (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating cheque:', error);
      return NextResponse.json(
        { error: 'Failed to create cheque record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: cheque }, { status: 201 });
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

// PUT /api/admin/fees/cheque-register - Update cheque status
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const chequeId = body.cheque_id;
    const status = body.status;
    const clearedDate = body.cleared_date;

    if (!schoolId || !chequeId || !status) {
      return NextResponse.json(
        { error: 'School ID, cheque ID, and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['issued', 'cleared', 'bounced', 'cancelled', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    
    // Set cleared date if status is cleared
    if (status === 'cleared' && clearedDate) {
      updateData.cleared_date = clearedDate;
    }

    // Update the cheque
    const { data: cheque, error } = await supabase
      .from('cheque_register')
      .update(updateData)
      .eq('id', chequeId)
      .eq('school_id', schoolId)
      .select(`
        *,
        bank_accounts (
          id,
          account_name,
          bank_name,
          account_number
        ),
        issued_by_user:issued_by (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating cheque:', error);
      return NextResponse.json(
        { error: 'Failed to update cheque' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: cheque });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}