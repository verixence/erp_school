import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for cheque book
const chequeBookSchema = z.object({
  bank_account_id: z.string().uuid('Valid bank account ID is required'),
  book_name: z.string().min(1, 'Book name is required'),
  cheque_start_no: z.string().min(1, 'Start number is required'),
  cheque_end_no: z.string().min(1, 'End number is required'),
  issued_date: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true)
});

// GET /api/admin/fees/cheque-books - List cheque books
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const bankAccountId = searchParams.get('bank_account_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('cheque_books')
      .select(`
        *,
        bank_accounts (
          id,
          account_name,
          bank_name,
          account_number
        )
      `)
      .eq('school_id', schoolId);

    if (bankAccountId) {
      query = query.eq('bank_account_id', bankAccountId);
    }

    const { data: chequeBooks, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cheque books:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cheque books' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: chequeBooks,
      summary: {
        total_books: chequeBooks?.length || 0,
        active_books: chequeBooks?.filter(cb => cb.status === 'active').length || 0,
        exhausted_books: chequeBooks?.filter(cb => cb.status === 'exhausted').length || 0
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

// POST /api/admin/fees/cheque-books - Create cheque book
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
    const validatedData = chequeBookSchema.parse(body);

    // Verify start number is less than or equal to end number
    const startNo = parseInt(validatedData.cheque_start_no);
    const endNo = parseInt(validatedData.cheque_end_no);

    if (isNaN(startNo) || isNaN(endNo)) {
      return NextResponse.json(
        { error: 'Cheque numbers must be numeric' },
        { status: 400 }
      );
    }

    if (startNo > endNo) {
      return NextResponse.json(
        { error: 'Start number must be less than or equal to end number' },
        { status: 400 }
      );
    }

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

    // Check for duplicate book name
    const { data: existing } = await supabase
      .from('cheque_books')
      .select('id')
      .eq('bank_account_id', validatedData.bank_account_id)
      .eq('book_name', validatedData.book_name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A cheque book with this name already exists for this account' },
        { status: 409 }
      );
    }

    // Create the cheque book
    const { data: chequeBook, error } = await supabase
      .from('cheque_books')
      .insert({
        school_id: schoolId,
        ...validatedData,
        status: 'active',
        used_cheques: 0
      })
      .select(`
        *,
        bank_accounts (
          id,
          account_name,
          bank_name,
          account_number
        )
      `)
      .single();

    if (error) {
      console.error('Error creating cheque book:', error);
      return NextResponse.json(
        { error: 'Failed to create cheque book' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: chequeBook }, { status: 201 });
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

// PUT /api/admin/fees/cheque-books - Update cheque book
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const chequeBookId = body.cheque_book_id;

    if (!schoolId || !chequeBookId) {
      return NextResponse.json(
        { error: 'School ID and cheque book ID are required' },
        { status: 400 }
      );
    }

    // Remove cheque_book_id from validation data
    const { cheque_book_id, ...updateData } = body;
    const validatedData = chequeBookSchema.partial().parse(updateData);

    // Update the cheque book
    const { data: chequeBook, error } = await supabase
      .from('cheque_books')
      .update(validatedData)
      .eq('id', chequeBookId)
      .eq('school_id', schoolId)
      .select(`
        *,
        bank_accounts (
          id,
          account_name,
          bank_name,
          account_number
        )
      `)
      .single();

    if (error) {
      console.error('Error updating cheque book:', error);
      return NextResponse.json(
        { error: 'Failed to update cheque book' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: chequeBook });
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

// DELETE /api/admin/fees/cheque-books - Delete cheque book
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const chequeBookId = searchParams.get('cheque_book_id');

    if (!schoolId || !chequeBookId) {
      return NextResponse.json(
        { error: 'School ID and cheque book ID are required' },
        { status: 400 }
      );
    }

    // Check if any cheques have been issued from this book
    const { data: chequeBook } = await supabase
      .from('cheque_books')
      .select('used_cheques')
      .eq('id', chequeBookId)
      .single();

    if (chequeBook && chequeBook.used_cheques > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: Cheques have been issued from this book' },
        { status: 409 }
      );
    }

    // Delete the cheque book
    const { error } = await supabase
      .from('cheque_books')
      .delete()
      .eq('id', chequeBookId)
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error deleting cheque book:', error);
      return NextResponse.json(
        { error: 'Failed to delete cheque book' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Cheque book deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
