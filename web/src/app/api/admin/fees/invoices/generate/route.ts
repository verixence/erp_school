import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// POST /api/admin/fees/invoices/generate - Generate fee invoice for a student
const generateSchema = z.object({
  student_id: z.string().uuid(),
  academic_year: z.string().min(1),
  billing_period: z.string().min(1),
  due_date: z.string().min(1),
  discount_percentage: z.number().min(0).max(100).optional(),
  fee_structures: z.array(z.object({
    fee_structure_id: z.string().uuid(),
    amount: z.number().positive()
  })).min(1)
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validationResult = generateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const {
      student_id,
      academic_year,
      billing_period,
      due_date,
      discount_percentage = 0,
      fee_structures
    } = validationResult.data;

    // Check if invoice already exists for this student and billing period
    const { data: existingInvoice, error: existingError } = await supabase
      .from('fee_invoices')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_id', student_id)
      .eq('academic_year', academic_year)
      .eq('billing_period', billing_period)
      .single();

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice already exists for this student and billing period' },
        { status: 409 }
      );
    }

    // Check for student-specific fee demands (customized amounts)
    const { data: studentDemands } = await supabase
      .from('student_fee_demands')
      .select('fee_structure_id, demand_amount, discount_amount, discount_reason')
      .eq('school_id', schoolId)
      .eq('student_id', student_id)
      .eq('academic_year', academic_year);

    // Create a map of fee_structure_id to demand details
    const demandsMap = new Map<string, { demand_amount: number; discount_amount: number }>();
    (studentDemands || []).forEach(demand => {
      demandsMap.set(demand.fee_structure_id, {
        demand_amount: demand.demand_amount,
        discount_amount: demand.discount_amount
      });
    });

    // Calculate total amount using student-specific demands or default structure amounts
    let totalAmount = 0;
    let totalDiscountApplied = 0;

    const finalFeeStructures = fee_structures.map(fs => {
      const studentDemand = demandsMap.get(fs.fee_structure_id);

      if (studentDemand) {
        // Use student-specific demand amount
        totalAmount += studentDemand.demand_amount;
        totalDiscountApplied += studentDemand.discount_amount;
        return {
          ...fs,
          final_amount: studentDemand.demand_amount,
          discount: studentDemand.discount_amount
        };
      } else {
        // Use default amount with percentage discount if provided
        const itemDiscount = (fs.amount * discount_percentage) / 100;
        const itemFinal = fs.amount - itemDiscount;
        totalAmount += itemFinal;
        totalDiscountApplied += itemDiscount;
        return {
          ...fs,
          final_amount: itemFinal,
          discount: itemDiscount
        };
      }
    });

    // Generate invoice number using database function
    const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
      .rpc('generate_invoice_number', { p_school_id: schoolId });

    if (invoiceNumberError) {
      console.error('Error generating invoice number:', invoiceNumberError);
      return NextResponse.json(
        { error: 'Failed to generate invoice number' },
        { status: 500 }
      );
    }

    const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`;

    // Get current user for generated_by field
    const { data: { user } } = await supabase.auth.getUser();

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('fee_invoices')
      .insert({
        school_id: schoolId,
        student_id,
        invoice_number: invoiceNumber,
        academic_year,
        billing_period,
        due_date,
        total_amount: totalAmount,
        paid_amount: 0,
        due_amount: totalAmount,
        status: 'pending',
        discount_applied: totalDiscountApplied,
        late_fee_applied: 0,
        generated_by: user?.id || null
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // Create invoice items using finalized amounts
    const invoiceItems = finalFeeStructures.map(fs => {
      return {
        invoice_id: invoice.id,
        fee_structure_id: fs.fee_structure_id,
        description: '',
        quantity: 1,
        unit_amount: fs.amount,
        total_amount: fs.final_amount,
        discount_percentage: fs.discount > 0 ? ((fs.discount / fs.amount) * 100) : 0,
        discount_amount: fs.discount
      };
    });

    const { error: itemsError } = await supabase
      .from('fee_invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError);
      // Rollback: delete the invoice
      await supabase.from('fee_invoices').delete().eq('id', invoice.id);
      return NextResponse.json(
        { error: 'Failed to create invoice items' },
        { status: 500 }
      );
    }

    // Fetch complete invoice with items for response
    const { data: completeInvoice, error: fetchError } = await supabase
      .from('fee_invoices')
      .select(`
        *,
        students (
          id,
          full_name,
          grade,
          section,
          admission_no
        ),
        fee_invoice_items (
          *,
          fee_structures (
            id,
            fee_categories (
              id,
              name
            )
          )
        )
      `)
      .eq('id', invoice.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete invoice:', fetchError);
      return NextResponse.json(
        { error: 'Invoice created but failed to fetch details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: completeInvoice,
      message: 'Invoice generated successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
