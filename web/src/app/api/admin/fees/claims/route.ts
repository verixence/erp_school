import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for expense claim
const expenseClaimSchema = z.object({
  employee_name: z.string().optional(), // Will be fetched from user if empty
  employee_id: z.string().optional(),
  department: z.string().optional(),
  claim_date: z.string(),
  expense_date: z.string(),
  expense_type_id: z.string().uuid().optional(),
  expense_category: z.enum(['transport', 'meals', 'supplies', 'accommodation', 'other']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  receipt_url: z.string().optional(), // Allow optional URL
  receipt_file_name: z.string().optional(),
  payment_method: z.enum(['cash', 'bank_transfer', 'reimbursement']).optional(),
  bank_account_number: z.string().optional(),
  bank_name: z.string().optional(),
  ifsc_code: z.string().optional()
});

// GET /api/admin/fees/claims - List expense claims
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Try to get auth token from header as fallback
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: token,
      });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('expense_claims')
      .select(`
        *,
        expense_types (
          id,
          name,
          description
        ),
        users!expense_claims_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          display_name
        ),
        reviewed_by_user:users!expense_claims_reviewed_by_fkey (
          id,
          email,
          first_name,
          last_name,
          display_name
        )
      `)
      .eq('school_id', schoolId);

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: claims, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expense claims:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expense claims' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: claims });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/fees/claims - Create expense claim
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Try to get auth token from header as fallback
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: token, // Not ideal but works for this use case
      });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error in POST:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }
    if (!user) {
      console.error('No user found in session for POST');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Validate input
    const validatedData = expenseClaimSchema.parse(body);

    // If employee_name is empty, fetch from users table
    let employeeName = validatedData.employee_name;
    if (!employeeName || employeeName.trim() === '') {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, display_name')
        .eq('id', user.id)
        .single();

      employeeName = userData?.display_name ||
                     `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() ||
                     'Unknown';
    }

    // Create the claim
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .insert({
        school_id: schoolId,
        user_id: user.id,
        ...validatedData,
        employee_name: employeeName,
        status: 'pending'
      })
      .select(`
        *,
        expense_types (
          id,
          name,
          description
        ),
        users!expense_claims_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          display_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating expense claim:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to create expense claim', details: error.message, hint: error.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: claim }, { status: 201 });
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

// PATCH /api/admin/fees/claims - Update claim status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Try to get auth token from header as fallback
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: token,
      });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const claimId = body.claim_id;

    if (!schoolId || !claimId) {
      return NextResponse.json(
        { error: 'School ID and Claim ID are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updateData: any = {
      status: body.status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: body.review_notes
    };

    if (body.status === 'approved') {
      updateData.approved_amount = body.approved_amount;
    }

    if (body.status === 'rejected') {
      updateData.rejection_reason = body.rejection_reason;
    }

    if (body.status === 'paid') {
      updateData.paid_by = user.id;
      updateData.paid_at = new Date().toISOString();
      updateData.payment_reference = body.payment_reference;
      updateData.payment_notes = body.payment_notes;
    }

    // Update the claim
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .update(updateData)
      .eq('id', claimId)
      .eq('school_id', schoolId)
      .select(`
        *,
        expense_types (
          id,
          name,
          description
        ),
        users!expense_claims_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          display_name
        ),
        reviewed_by_user:users!expense_claims_reviewed_by_fkey (
          id,
          email,
          first_name,
          last_name,
          display_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating expense claim:', error);
      return NextResponse.json(
        { error: 'Failed to update expense claim' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: claim });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
