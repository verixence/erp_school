import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const teacherId = searchParams.get('teacher_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Get overdue fee demands with student details
    const { data: overdueFees, error } = await supabase
      .from('student_fee_demands')
      .select(`
        id,
        student_id,
        demand_amount,
        paid_amount,
        balance_amount,
        due_date,
        payment_status,
        academic_year,
        students (
          id,
          full_name,
          admission_no,
          grade,
          section
        ),
        fee_structures (
          id,
          fee_categories (
            id,
            name
          )
        )
      `)
      .eq('school_id', schoolId)
      .in('payment_status', ['pending', 'partial'])
      .not('due_date', 'is', null)
      .lte('due_date', today)
      .gt('balance_amount', 0)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching overdue fees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch overdue fees' },
        { status: 500 }
      );
    }

    // Transform data for teacher view
    const transformedData = (overdueFees || []).map((fee: any) => ({
      id: fee.id,
      student_id: fee.student_id,
      student_name: fee.students?.full_name || 'Unknown',
      admission_number: fee.students?.admission_no || 'N/A',
      grade: fee.students?.grade || 'N/A',
      section: fee.students?.section || 'N/A',
      fee_type: fee.fee_structures?.fee_categories?.name || 'Unknown',
      demand_amount: parseFloat(fee.demand_amount || 0),
      paid_amount: parseFloat(fee.paid_amount || 0),
      balance_amount: parseFloat(fee.balance_amount || 0),
      due_date: fee.due_date,
      days_overdue: Math.floor((new Date().getTime() - new Date(fee.due_date).getTime()) / (1000 * 60 * 60 * 24)),
      payment_status: fee.payment_status,
      academic_year: fee.academic_year
    }));

    // Calculate summary statistics
    const summary = {
      total_overdue_count: transformedData.length,
      total_overdue_amount: transformedData.reduce((sum, fee) => sum + fee.balance_amount, 0),
      students_affected: new Set(transformedData.map(fee => fee.student_id)).size,
      by_grade: {} as Record<string, { count: number; amount: number }>
    };

    // Group by grade
    transformedData.forEach(fee => {
      const grade = fee.grade;
      if (!summary.by_grade[grade]) {
        summary.by_grade[grade] = { count: 0, amount: 0 };
      }
      summary.by_grade[grade].count++;
      summary.by_grade[grade].amount += fee.balance_amount;
    });

    return NextResponse.json({
      success: true,
      data: transformedData,
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
