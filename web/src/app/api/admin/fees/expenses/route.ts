import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for expense recording
const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  expense_date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date'),
  payment_method: z.enum(['cash', 'cheque', 'bank_transfer', 'card', 'online']).optional(),
  payment_reference: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_contact: z.string().optional(),
  receipt_url: z.string().optional().or(z.literal('')),
  approved_by: z.string().uuid().optional(),
  notes: z.string().optional().or(z.literal(''))
});

// GET /api/admin/fees/expenses - List school expenses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const category = searchParams.get('category');
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
      .from('school_expenses')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (fromDate) {
      query = query.gte('expense_date', fromDate);
    }

    if (toDate) {
      query = query.lte('expense_date', toDate);
    }

    const { data: expenses, error, count } = await query
      .order('expense_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching expenses:', error);
      // If table doesn't exist, return empty data instead of error
      if (error.code === '42P01') {
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          },
          summary: {
            total_expenses: 0,
            total_amount: 0,
            pending_amount: 0,
            approved_amount: 0,
            paid_amount: 0,
            by_category: {},
            monthly_trend: {}
          }
        });
      }
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('school_expenses')
      .select('status, amount, category, expense_date')
      .eq('school_id', schoolId);

    // If table doesn't exist, use empty summary data
    if (summaryError && summaryError.code === '42P01') {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        },
        summary: {
          total_expenses: 0,
          total_amount: 0,
          pending_amount: 0,
          approved_amount: 0,
          paid_amount: 0,
          by_category: {},
          monthly_trend: {}
        }
      });
    }

    let summary = {
      total_expenses: 0,
      total_amount: 0,
      pending_amount: 0,
      approved_amount: 0,
      paid_amount: 0,
      by_category: {} as Record<string, { count: number; amount: number }>,
      monthly_trend: {} as Record<string, number>
    };

    if (summaryData) {
      summary = summaryData.reduce((acc, expense) => {
        acc.total_expenses++;
        const amount = parseFloat(expense.amount || '0');
        acc.total_amount += amount;

        // Status-wise totals
        if (expense.status === 'pending') {
          acc.pending_amount += amount;
        } else if (expense.status === 'approved') {
          acc.approved_amount += amount;
        } else if (expense.status === 'paid') {
          acc.paid_amount += amount;
        }

        // Category-wise breakdown
        if (!acc.by_category[expense.category]) {
          acc.by_category[expense.category] = { count: 0, amount: 0 };
        }
        acc.by_category[expense.category].count++;
        acc.by_category[expense.category].amount += amount;

        // Monthly trend
        const monthKey = expense.expense_date.substring(0, 7); // YYYY-MM
        acc.monthly_trend[monthKey] = (acc.monthly_trend[monthKey] || 0) + amount;

        return acc;
      }, summary);
    }

    return NextResponse.json({
      data: expenses,
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

// POST /api/admin/fees/expenses - Create new expense
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
    const validatedData = expenseSchema.parse(body);

    // Generate expense number
    const { data: expenseNumberData, error: expenseNumberError } = await supabase
      .rpc('generate_expense_number', { p_school_id: schoolId });

    const expenseNumber = expenseNumberData || `EXP-${Date.now()}`;

    // Build insert data, filtering out undefined/null values
    const insertData: any = {
      school_id: schoolId,
      expense_number: expenseNumber,
      category: validatedData.category,
      description: validatedData.description,
      amount: validatedData.amount,
      expense_date: validatedData.expense_date,
      status: 'pending'
    };

    // Add optional fields only if provided
    if (validatedData.subcategory) insertData.subcategory = validatedData.subcategory;
    if (validatedData.payment_method) insertData.payment_method = validatedData.payment_method;
    if (validatedData.payment_reference) insertData.payment_reference = validatedData.payment_reference;
    if (validatedData.vendor_name) insertData.vendor_name = validatedData.vendor_name;
    if (validatedData.vendor_contact) insertData.vendor_contact = validatedData.vendor_contact;
    if (validatedData.receipt_url) insertData.receipt_url = validatedData.receipt_url;
    if (validatedData.notes) insertData.notes = validatedData.notes;

    console.log('Inserting expense:', insertData);

    // Create the expense record
    const { data: expense, error: expenseError } = await supabase
      .from('school_expenses')
      .insert(insertData)
      .select('*')
      .single();

    if (expenseError) {
      console.error('Error creating expense:', expenseError);
      console.error('Attempted data:', {
        school_id: schoolId,
        expense_number: expenseNumber,
        ...validatedData
      });
      return NextResponse.json(
        {
          error: 'Failed to create expense',
          details: expenseError.message,
          hint: expenseError.hint,
          code: expenseError.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: expense }, { status: 201 });
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

// PUT /api/admin/fees/expenses - Update expense status
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const expenseId = body.expense_id;
    const status = body.status;
    const processedBy = body.processed_by;

    if (!schoolId || !expenseId || !status) {
      return NextResponse.json(
        { error: 'School ID, expense ID, and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['pending', 'approved', 'paid', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update the expense
    const { data: expense, error: updateError } = await supabase
      .from('school_expenses')
      .update({
        status,
        processed_by: processedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .eq('school_id', schoolId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating expense:', updateError);
      return NextResponse.json(
        { error: 'Failed to update expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: expense });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}