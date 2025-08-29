import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for fee category
const feeCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  is_mandatory: z.boolean().default(true),
  display_order: z.number().min(0).default(0),
  is_active: z.boolean().default(true)
});

// GET /api/admin/fees/categories - List fee categories
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

    const { data: categories, error } = await supabase
      .from('fee_categories')
      .select('*')
      .eq('school_id', schoolId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching fee categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/fees/categories - Create fee category
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
    const validatedData = feeCategorySchema.parse(body);

    // Check for duplicate category name
    const { data: existingCategory } = await supabase
      .from('fee_categories')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', validatedData.name)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }

    // Create the category
    const { data: category, error } = await supabase
      .from('fee_categories')
      .insert({
        school_id: schoolId,
        ...validatedData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating fee category:', error);
      return NextResponse.json(
        { error: 'Failed to create fee category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: category }, { status: 201 });
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