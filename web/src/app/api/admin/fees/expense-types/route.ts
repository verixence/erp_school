import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for expense type
const expenseTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

// GET /api/admin/fees/expense-types - List expense types
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

    const { data: expenseTypes, error } = await supabase
      .from('expense_types')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expense types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expense types' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: expenseTypes,
      summary: {
        total: expenseTypes?.length || 0,
        active: expenseTypes?.filter(et => et.is_active).length || 0
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

// POST /api/admin/fees/expense-types - Create expense type
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
    const validatedData = expenseTypeSchema.parse(body);

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('expense_types')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', validatedData.name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An expense type with this name already exists' },
        { status: 409 }
      );
    }

    // Create the expense type
    const { data: expenseType, error } = await supabase
      .from('expense_types')
      .insert({
        school_id: schoolId,
        ...validatedData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating expense type:', error);
      return NextResponse.json(
        { error: 'Failed to create expense type' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: expenseType }, { status: 201 });
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

// PUT /api/admin/fees/expense-types - Update expense type
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const expenseTypeId = body.expense_type_id;

    if (!schoolId || !expenseTypeId) {
      return NextResponse.json(
        { error: 'School ID and expense type ID are required' },
        { status: 400 }
      );
    }

    // Remove expense_type_id from validation data
    const { expense_type_id, ...updateData } = body;
    const validatedData = expenseTypeSchema.partial().parse(updateData);

    // Update the expense type
    const { data: expenseType, error } = await supabase
      .from('expense_types')
      .update(validatedData)
      .eq('id', expenseTypeId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense type:', error);
      return NextResponse.json(
        { error: 'Failed to update expense type' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: expenseType });
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

// DELETE /api/admin/fees/expense-types - Delete expense type
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const expenseTypeId = searchParams.get('expense_type_id');

    if (!schoolId || !expenseTypeId) {
      return NextResponse.json(
        { error: 'School ID and expense type ID are required' },
        { status: 400 }
      );
    }

    // Check if expense type is used in any expenses
    const { data: usageCheck } = await supabase
      .from('school_expenses')
      .select('id')
      .eq('expense_type_id', expenseTypeId)
      .limit(1);

    if (usageCheck && usageCheck.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: This expense type is used in existing expenses' },
        { status: 409 }
      );
    }

    // Delete the expense type
    const { error } = await supabase
      .from('expense_types')
      .delete()
      .eq('id', expenseTypeId)
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error deleting expense type:', error);
      return NextResponse.json(
        { error: 'Failed to delete expense type' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Expense type deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
