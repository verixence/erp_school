import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const itemSchema = z.object({
  category_id: z.string().uuid(),
  item_code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  unit_of_measurement: z.string().optional(),
  minimum_stock_level: z.number().int().min(0).default(0),
  current_stock: z.number().int().min(0).default(0),
  unit_price: z.number().min(0).default(0),
  location: z.string().optional(),
  condition: z.enum(['good', 'fair', 'poor', 'damaged']).default('good'),
  status: z.enum(['active', 'inactive', 'retired']).default('active'),
  purchase_date: z.string().optional(),
  warranty_expiry_date: z.string().optional(),
  supplier_name: z.string().optional(),
  serial_number: z.string().optional(),
  barcode: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');
  const categoryId = searchParams.get('category_id');
  const status = searchParams.get('status');
  const lowStock = searchParams.get('low_stock');

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      category:inventory_categories(id, name)
    `)
    .eq('school_id', schoolId);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('name', { ascending: true });

  const { data: items, error } = await query;

  // Filter low stock items in JavaScript
  let filteredItems = items;
  if (lowStock === 'true' && items) {
    filteredItems = items.filter((item: any) => item.current_stock <= item.minimum_stock_level);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: filteredItems });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { school_id, ...itemData } = body;

  if (!school_id) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  try {
    const validated = itemSchema.parse(itemData);

    const { data: item, error } = await supabase
      .from('inventory_items')
      .insert({
        school_id,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
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

  const { id, school_id, ...itemData } = body;

  if (!id || !school_id) {
    return NextResponse.json({ error: 'Item ID and School ID required' }, { status: 400 });
  }

  try {
    const validated = itemSchema.partial().parse(itemData);

    const { data: item, error } = await supabase
      .from('inventory_items')
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

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const schoolId = searchParams.get('school_id');

  if (!id || !schoolId) {
    return NextResponse.json({ error: 'Item ID and School ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
