import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/fees/receipts - Fetch all receipts for a school or student
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('school_id');
    const studentId = searchParams.get('student_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('fee_receipts')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('receipt_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (startDate) {
      query = query.gte('receipt_date', startDate);
    }

    if (endDate) {
      query = query.lte('receipt_date', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      receipts: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in GET /api/admin/fees/receipts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/fees/receipts - Create a new receipt record
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      student_id,
      receipt_no,
      student_name,
      student_admission_no,
      student_grade,
      student_section,
      parent_name,
      parent_phone,
      parent_email,
      payment_method,
      payment_date,
      reference_number,
      notes,
      receipt_items,
      total_amount,
      school_name,
      school_address,
      school_phone,
      school_email,
      school_logo_url
    } = body;

    // Validate required fields
    if (!student_id || !receipt_no || !student_name || !payment_method || !payment_date || !receipt_items || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Insert receipt
    const { data, error } = await supabase
      .from('fee_receipts')
      .insert({
        school_id: schoolId,
        student_id,
        receipt_no,
        student_name,
        student_admission_no,
        student_grade,
        student_section,
        parent_name,
        parent_phone,
        parent_email,
        payment_method,
        payment_date,
        reference_number,
        notes,
        receipt_items,
        total_amount,
        school_name,
        school_address,
        school_phone,
        school_email,
        school_logo_url,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating receipt:', error);
      return NextResponse.json(
        { error: 'Failed to create receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ receipt: data });
  } catch (error) {
    console.error('Error in POST /api/admin/fees/receipts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
