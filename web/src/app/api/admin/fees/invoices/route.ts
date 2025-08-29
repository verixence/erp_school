import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// GET /api/admin/fees/invoices - List fee invoices with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const status = searchParams.get('status');
    const academicYear = searchParams.get('academic_year');
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    const studentId = searchParams.get('student_id');
    const billingPeriod = searchParams.get('billing_period');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('fee_invoices')
      .select(`
        *,
        students (
          id,
          full_name,
          grade,
          section,
          admission_no
        )
      `, { count: 'exact' })
      .eq('school_id', schoolId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    if (grade) {
      query = query.eq('students.grade', grade);
    }

    if (section) {
      query = query.eq('students.section', section);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (billingPeriod) {
      query = query.eq('billing_period', billingPeriod);
    }

    if (fromDate) {
      query = query.gte('due_date', fromDate);
    }

    if (toDate) {
      query = query.lte('due_date', toDate);
    }

    const { data: invoices, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('fee_invoices')
      .select('status, total_amount, paid_amount, due_amount')
      .eq('school_id', schoolId);

    let summary = {
      total_invoices: 0,
      total_amount: 0,
      paid_amount: 0,
      due_amount: 0,
      pending_count: 0,
      paid_count: 0,
      overdue_count: 0,
      partial_count: 0
    };

    if (summaryData) {
      summary = summaryData.reduce((acc, invoice) => {
        acc.total_invoices++;
        acc.total_amount += parseFloat(invoice.total_amount || '0');
        acc.paid_amount += parseFloat(invoice.paid_amount || '0');
        acc.due_amount += parseFloat(invoice.due_amount || '0');

        switch (invoice.status) {
          case 'pending':
            acc.pending_count++;
            break;
          case 'paid':
            acc.paid_count++;
            break;
          case 'overdue':
            acc.overdue_count++;
            break;
          case 'partial':
            acc.partial_count++;
            break;
        }

        return acc;
      }, summary);
    }

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      summary
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}