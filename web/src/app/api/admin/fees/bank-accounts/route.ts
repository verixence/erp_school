import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for bank account
const bankAccountSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  ifsc_code: z.string().optional(),
  branch_name: z.string().optional(),
  account_type: z.enum(['savings', 'current']).default('current'),
  opening_balance: z.number().default(0),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true)
});

// GET /api/admin/fees/bank-accounts - List bank accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('school_id', schoolId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bank accounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bank accounts' },
        { status: 500 }
      );
    }

    // Calculate total balance
    const totalBalance = accounts?.reduce((sum, account) => 
      sum + parseFloat(account.current_balance || '0'), 0) || 0;

    return NextResponse.json({
      data: accounts,
      summary: {
        total_accounts: accounts?.length || 0,
        active_accounts: accounts?.filter(a => a.is_active).length || 0,
        total_balance: totalBalance,
        primary_account: accounts?.find(a => a.is_primary) || null
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/fees/bank-accounts - Create bank account
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
    const validatedData = bankAccountSchema.parse(body);

    // If this is set as primary, remove primary flag from other accounts
    if (validatedData.is_primary) {
      await supabase
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq('school_id', schoolId);
    }

    // Check for duplicate account number
    const { data: existingAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('school_id', schoolId)
      .eq('account_number', validatedData.account_number)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: 'An account with this number already exists' },
        { status: 409 }
      );
    }

    // Create the bank account
    const { data: account, error } = await supabase
      .from('bank_accounts')
      .insert({
        school_id: schoolId,
        ...validatedData,
        current_balance: validatedData.opening_balance
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bank account:', error);
      return NextResponse.json(
        { error: 'Failed to create bank account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: account }, { status: 201 });
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

// PUT /api/admin/fees/bank-accounts - Update bank account
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const accountId = body.account_id;

    if (!schoolId || !accountId) {
      return NextResponse.json(
        { error: 'School ID and account ID are required' },
        { status: 400 }
      );
    }

    // Remove account_id from validation data
    const { account_id, ...updateData } = body;
    const validatedData = bankAccountSchema.partial().parse(updateData);

    // If this is set as primary, remove primary flag from other accounts
    if (validatedData.is_primary) {
      await supabase
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq('school_id', schoolId)
        .neq('id', accountId);
    }

    // Update the bank account
    const { data: account, error } = await supabase
      .from('bank_accounts')
      .update(validatedData)
      .eq('id', accountId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bank account:', error);
      return NextResponse.json(
        { error: 'Failed to update bank account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: account });
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