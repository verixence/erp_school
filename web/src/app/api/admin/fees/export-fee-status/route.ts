import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const paymentStatus = searchParams.get('payment_status'); // all, pending, partial, paid
    const gradeFilter = searchParams.get('grade');
    const sectionFilter = searchParams.get('section');
    const academicYear = searchParams.get('academic_year');
    const format = searchParams.get('format') || 'csv'; // csv or json
    const viewType = searchParams.get('view') || 'summary'; // summary or detailed

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Use appropriate database function based on view type
    const functionName = viewType === 'detailed' ? 'export_fee_status' : 'export_fee_status_summary';

    const { data: feeStatusData, error } = await supabase.rpc(functionName, {
      p_school_id: schoolId,
      p_academic_year: academicYear || null,
      p_payment_status: paymentStatus || null,
      p_grade: gradeFilter || null,
      p_section: sectionFilter || null
    });

    if (error) {
      console.error('Error fetching fee status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee status', details: error.message },
        { status: 500 }
      );
    }

    if (!feeStatusData || feeStatusData.length === 0) {
      return NextResponse.json(
        { error: 'No fee data found for the selected filters' },
        { status: 404 }
      );
    }

    console.log(`Fetched ${feeStatusData.length} fee records for export (${viewType} view)`);

    // Transform data for export based on view type
    const exportData = viewType === 'detailed'
      ? feeStatusData.map((record: any) => ({
          'Admission Number': record.admission_no || 'N/A',
          'Student Name': record.student_name || 'Unknown',
          'Grade': record.grade || 'N/A',
          'Section': record.section || 'N/A',
          'Academic Year': record.academic_year,
          'Fee Type': record.fee_type || 'N/A',
          'Original Amount': parseFloat(record.original_amount || 0).toFixed(2),
          'Discount': parseFloat(record.discount_amount || 0).toFixed(2),
          'Demand Amount': parseFloat(record.demand_amount || 0).toFixed(2),
          'Paid Amount': parseFloat(record.paid_amount || 0).toFixed(2),
          'Balance Amount': parseFloat(record.balance_amount || 0).toFixed(2),
          'Payment Status': record.payment_status || 'pending',
          'Due Date': record.due_date || 'Not Set',
          'Last Updated': record.updated_at ? new Date(record.updated_at).toLocaleDateString() : 'N/A'
        }))
      : feeStatusData.map((record: any) => ({
          'Admission Number': record.admission_no || 'N/A',
          'Student Name': record.student_name || 'Unknown',
          'Grade': record.grade || 'N/A',
          'Section': record.section || 'N/A',
          'Academic Year': record.academic_year,
          'Total Original Amount': parseFloat(record.total_original_amount || 0).toFixed(2),
          'Total Discount': parseFloat(record.total_discount_amount || 0).toFixed(2),
          'Total Demand Amount': parseFloat(record.total_demand_amount || 0).toFixed(2),
          'Total Paid Amount': parseFloat(record.total_paid_amount || 0).toFixed(2),
          'Total Balance Amount': parseFloat(record.total_balance_amount || 0).toFixed(2),
          'Overall Payment Status': record.overall_payment_status || 'pending',
          'Last Updated': record.last_updated ? new Date(record.last_updated).toLocaleDateString() : 'N/A'
        }));

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        count: exportData.length
      });
    }

    // Generate CSV
    if (exportData.length === 0) {
      return NextResponse.json(
        { error: 'No data to export' },
        { status: 404 }
      );
    }

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes in values
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="fee-status-${schoolId}-${new Date().toISOString().split('T')[0]}.csv"`
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
