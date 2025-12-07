import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// GET /api/admin/fees/structures/summary - Get fee structure summary (total per class)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const academicYear = searchParams.get('academic_year');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    // Route is protected by Next.js middleware/auth
    const supabase = createAdminClient();

    // Get all fee structures for the school
    let query = supabase
      .from('fee_structures')
      .select(`
        id,
        grade,
        academic_year,
        amount,
        fee_category_id,
        is_active,
        fee_categories (
          id,
          name
        )
      `)
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: structures, error } = await query.order('grade', { ascending: true });

    if (error) {
      console.error('Error fetching fee structures:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee structures' },
        { status: 500 }
      );
    }

    // Group by class and academic year, sum amounts
    const summaryMap = new Map<string, {
      grade: string;
      academic_year: string;
      total_amount: number;
      fee_count: number;
      fee_types: string[];
    }>();

    structures?.forEach(structure => {
      const key = `${structure.grade}-${structure.academic_year}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          grade: structure.grade,
          academic_year: structure.academic_year,
          total_amount: 0,
          fee_count: 0,
          fee_types: []
        });
      }

      const summary = summaryMap.get(key)!;
      summary.total_amount += Number(structure.amount) || 0;
      summary.fee_count += 1;

      // Handle fee_categories - could be array or object
      const feeCategory = structure.fee_categories;
      if (feeCategory && !Array.isArray(feeCategory)) {
        const categoryName = (feeCategory as any).name;
        if (categoryName) {
          summary.fee_types.push(categoryName);
        }
      }
    });

    // Convert to array and sort by grade
    const summaryArray = Array.from(summaryMap.values()).sort((a, b) => {
      const numA = parseInt(a.grade.replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(b.grade.replace(/[^0-9]/g, '')) || 0;
      if (numA && numB) return numA - numB;
      return a.grade.localeCompare(b.grade);
    });

    return NextResponse.json({
      data: summaryArray,
      summary: {
        total_classes: summaryArray.length,
        total_structures: structures?.length || 0
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
