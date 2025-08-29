import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for fee category update
const updateFeeCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
  description: z.string().optional(),
  is_mandatory: z.boolean().optional(),
  display_order: z.number().min(0).optional(),
  is_active: z.boolean().optional()
});

// GET /api/admin/fees/categories/[id] - Get fee category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: category, error } = await supabase
      .from('fee_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !category) {
      return NextResponse.json(
        { error: 'Fee category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/fees/categories/[id] - Update fee category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = updateFeeCategorySchema.parse(body);

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('fee_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Fee category not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const { data: duplicateCategory } = await supabase
        .from('fee_categories')
        .select('id')
        .eq('school_id', existingCategory.school_id)
        .eq('name', validatedData.name)
        .neq('id', id)
        .single();

      if (duplicateCategory) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the category
    const { data: updatedCategory, error } = await supabase
      .from('fee_categories')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating fee category:', error);
      return NextResponse.json(
        { error: 'Failed to update fee category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedCategory });
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

// DELETE /api/admin/fees/categories/[id] - Delete fee category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check if category is being used in fee structures
    const { data: usedInStructures, error: checkError } = await supabase
      .from('fee_structures')
      .select('id')
      .eq('fee_category_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking fee structure usage:', checkError);
      return NextResponse.json(
        { error: 'Failed to check category usage' },
        { status: 500 }
      );
    }

    if (usedInStructures && usedInStructures.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that is used in fee structures' },
        { status: 409 }
      );
    }

    // Delete the category
    const { error } = await supabase
      .from('fee_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fee category:', error);
      return NextResponse.json(
        { error: 'Failed to delete fee category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee category deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}