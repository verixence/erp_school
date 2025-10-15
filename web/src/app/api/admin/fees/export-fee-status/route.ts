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

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Build the query - get basic fee demand data
    let query = supabase
      .from('student_fee_demands')
      .select(`
        id,
        student_id,
        fee_structure_id,
        academic_year,
        original_amount,
        discount_amount,
        demand_amount,
        paid_amount,
        balance_amount,
        payment_status,
        due_date,
        created_at,
        updated_at
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: feeDemands, error } = await query;

    if (error) {
      console.error('Error fetching fee demands:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee demands' },
        { status: 500 }
      );
    }

    if (!feeDemands || feeDemands.length === 0) {
      return NextResponse.json(
        { error: 'No fee demands found' },
        { status: 404 }
      );
    }

    // Get unique student IDs and fee structure IDs
    const studentIds = [...new Set(feeDemands.map(d => d.student_id).filter(Boolean))];
    const feeStructureIds = [...new Set(feeDemands.map(d => d.fee_structure_id).filter(Boolean))];

    console.log('Student IDs to fetch:', studentIds);
    console.log('Fee Structure IDs to fetch:', feeStructureIds);

    // Fetch students data separately (bypassing RLS issues with joins)
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, admission_no, grade, section')
      .in('id', studentIds);

    console.log('Students fetched:', studentsData?.length, 'Error:', studentsError);

    // Fetch fee structures with categories
    const { data: feeStructuresData, error: feeStructuresError } = await supabase
      .from('fee_structures')
      .select(`
        id,
        amount,
        payment_frequency,
        fee_categories!fee_category_id (
          id,
          name
        )
      `)
      .in('id', feeStructureIds);

    console.log('Fee structures fetched:', feeStructuresData?.length, 'Error:', feeStructuresError);

    // Create lookup maps
    const studentsMap = new Map(studentsData?.map(s => [s.id, s]) || []);
    const feeStructuresMap = new Map(feeStructuresData?.map(f => [f.id, f]) || []);

    // Enrich fee demands with student and fee structure data
    const enrichedDemands = feeDemands.map(demand => ({
      ...demand,
      students: studentsMap.get(demand.student_id),
      fee_structures: feeStructuresMap.get(demand.fee_structure_id)
    }));

    console.log('Total fee demands fetched:', enrichedDemands.length);
    console.log('Filters - Grade:', gradeFilter, 'Section:', sectionFilter);
    console.log('Sample enriched:', JSON.stringify(enrichedDemands[0], null, 2));

    // Filter by grade and section on the client side (since they're nested)
    let filteredData = enrichedDemands.filter((demand: any) => {
      const gradeMatch = !gradeFilter || gradeFilter === 'all' || demand.students?.grade === gradeFilter;
      const sectionMatch = !sectionFilter || sectionFilter === 'all' || demand.students?.section === sectionFilter;
      return gradeMatch && sectionMatch;
    });

    console.log('Filtered data count:', filteredData.length);

    // Sort by grade, section, and student name
    filteredData.sort((a: any, b: any) => {
      const gradeA = a.students?.grade || '';
      const gradeB = b.students?.grade || '';
      if (gradeA !== gradeB) return gradeA.localeCompare(gradeB);

      const sectionA = a.students?.section || '';
      const sectionB = b.students?.section || '';
      if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);

      const nameA = a.students?.full_name || '';
      const nameB = b.students?.full_name || '';
      return nameA.localeCompare(nameB);
    });

    // Transform data for export
    const exportData = filteredData.map((demand: any) => ({
      'Admission Number': demand.students?.admission_no || 'N/A',
      'Student Name': demand.students?.full_name || 'Unknown',
      'Grade': demand.students?.grade || 'N/A',
      'Section': demand.students?.section || 'N/A',
      'Academic Year': demand.academic_year,
      'Fee Type': demand.fee_structures?.fee_categories?.name || 'N/A',
      'Original Amount': parseFloat(demand.original_amount || 0).toFixed(2),
      'Discount': parseFloat(demand.discount_amount || 0).toFixed(2),
      'Demand Amount': parseFloat(demand.demand_amount || 0).toFixed(2),
      'Paid Amount': parseFloat(demand.paid_amount || 0).toFixed(2),
      'Balance Amount': parseFloat(demand.balance_amount || 0).toFixed(2),
      'Payment Status': demand.payment_status || 'pending',
      'Due Date': demand.due_date || 'Not Set',
      'Last Updated': demand.updated_at ? new Date(demand.updated_at).toLocaleDateString() : 'N/A'
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
