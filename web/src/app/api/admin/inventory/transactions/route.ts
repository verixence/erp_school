import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const transactionSchema = z.object({
  item_id: z.string().uuid(),
  transaction_type: z.enum(['purchase', 'issue', 'return', 'adjustment', 'damage', 'loss']),
  quantity: z.number().int(),
  transaction_date: z.string().optional(),
  reference_number: z.string().optional(),
  performed_by: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');
  const itemId = searchParams.get('item_id');

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  let query = supabase
    .from('inventory_stock_transactions')
    .select(`
      *,
      item:inventory_items(id, name, item_code),
      user:users(id, display_name)
    `)
    .eq('school_id', schoolId);

  if (itemId) {
    query = query.eq('item_id', itemId);
  }

  query = query.order('transaction_date', { ascending: false });

  const { data: transactions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { school_id, ...transactionData } = body;

  if (!school_id) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  try {
    const validated = transactionSchema.parse(transactionData);

    const { data: transaction, error } = await supabase
      .from('inventory_stock_transactions')
      .insert({
        school_id,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
