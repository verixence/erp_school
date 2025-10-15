import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  const { data: categories, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { school_id, ...categoryData } = body;

  if (!school_id) {
    return NextResponse.json({ error: 'School ID required' }, { status: 400 });
  }

  try {
    const validated = categorySchema.parse(categoryData);

    const { data: category, error } = await supabase
      .from('inventory_categories')
      .insert({
        school_id,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
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

  const { id, school_id, ...categoryData } = body;

  if (!id || !school_id) {
    return NextResponse.json({ error: 'Category ID and School ID required' }, { status: 400 });
  }

  try {
    const validated = categorySchema.parse(categoryData);

    const { data: category, error } = await supabase
      .from('inventory_categories')
      .update(validated)
      .eq('id', id)
      .eq('school_id', school_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category });
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
    return NextResponse.json({ error: 'Category ID and School ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('inventory_categories')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
