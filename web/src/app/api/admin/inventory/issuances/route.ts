import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const issuanceSchema = z.object({
  item_id: z.string().uuid(),
  issued_to_type: z.enum(['student', 'teacher', 'staff', 'department']),
  issued_to_id: z.string().uuid().optional(),
  issued_to_name: z.string().min(1),
  quantity: z.number().int().min(1),
  issue_date: z.string().optional(),
  expected_return_date: z.string().optional(),
  actual_return_date: z.string().optional(),
  return_condition: z.enum(['good', 'damaged', 'lost']).optional(),
  issued_by: z.string().uuid().optional(),
  returned_to: z.string().uuid().optional(),
  purpose: z.string().optional(),
  status: z.enum(['issued', 'returned', 'overdue', 'lost']).default('issued'),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');
  const status = searchParams.get('status');
  const itemId = searchParams.get('item_id');
  const overdue = searchParams.get('overdue');

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  let query = supabase
    .from('inventory_issuances')
    .select(`
      *,
      item:inventory_items(id, name, item_code),
      issuer:issued_by(id, full_name),
      receiver:returned_to(id, full_name)
    `)
    .eq('school_id', schoolId);

  if (status) {
    query = query.eq('status', status);
  }

  if (itemId) {
    query = query.eq('item_id', itemId);
  }

  if (overdue === 'true') {
    const today = new Date().toISOString().split('T')[0];
    query = query.eq('status', 'issued').lt('expected_return_date', today);
  }

  query = query.order('issue_date', { ascending: false });

  const { data: issuances, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issuances });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { school_id, ...issuanceData } = body;

  if (!school_id) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  try {
    const validated = issuanceSchema.parse(issuanceData);

    // Check if item has enough stock
    const { data: item } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', validated.item_id)
      .single();

    if (item && item.current_stock < validated.quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock available' },
        { status: 400 }
      );
    }

    const { data: issuance, error } = await supabase
      .from('inventory_issuances')
      .insert({
        school_id,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create stock transaction for the issuance
    await supabase.from('inventory_stock_transactions').insert({
      school_id,
      item_id: validated.item_id,
      transaction_type: 'issue',
      quantity: validated.quantity,
      transaction_date: validated.issue_date || new Date().toISOString().split('T')[0],
      performed_by: validated.issued_by,
      notes: `Issued to ${validated.issued_to_name}`,
    });

    return NextResponse.json({ issuance }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { id, school_id, ...issuanceData } = body;

  if (!id || !school_id) {
    return NextResponse.json({ error: 'Issuance ID and School ID required' }, { status: 400 });
  }

  try {
    const validated = issuanceSchema.partial().parse(issuanceData);

    const { data: issuance, error } = await supabase
      .from('inventory_issuances')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_id', school_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If item is being returned, create a return transaction
    if (validated.actual_return_date) {
      const { data: originalIssuance } = await supabase
        .from('inventory_issuances')
        .select('item_id, quantity, issued_to_name')
        .eq('id', id)
        .single();

      if (originalIssuance) {
        await supabase.from('inventory_stock_transactions').insert({
          school_id,
          item_id: originalIssuance.item_id,
          transaction_type: 'return',
          quantity: originalIssuance.quantity,
          transaction_date: validated.actual_return_date,
          performed_by: validated.returned_to,
          notes: `Returned by ${originalIssuance.issued_to_name}`,
        });
      }
    }

    return NextResponse.json({ issuance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
