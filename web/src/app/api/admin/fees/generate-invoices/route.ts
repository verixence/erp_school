import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for invoice generation
const generateInvoicesSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  billing_period: z.string().min(1, 'Billing period is required'),
  due_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid due date'),
  grade_filter: z.string().optional(),
  section_filter: z.string().optional(),
  student_ids: z.array(z.string().uuid()).optional(),
  include_late_fees: z.boolean().default(false),
  send_notifications: z.boolean().default(true)
});

// POST /api/admin/fees/generate-invoices - Generate invoices for students
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
    const validatedData = generateInvoicesSchema.parse(body);
    const dueDate = new Date(validatedData.due_date);

    // Get students based on filters
    let studentsQuery = supabase
      .from('students')
      .select('id, full_name, grade, section, admission_no')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    if (validatedData.student_ids && validatedData.student_ids.length > 0) {
      studentsQuery = studentsQuery.in('id', validatedData.student_ids);
    } else {
      if (validatedData.grade_filter) {
        studentsQuery = studentsQuery.eq('grade', validatedData.grade_filter);
      }
      if (validatedData.section_filter) {
        studentsQuery = studentsQuery.eq('section', validatedData.section_filter);
      }
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found matching the criteria' },
        { status: 400 }
      );
    }

    const generationResults = {
      total_students: students.length,
      successful_invoices: 0,
      failed_invoices: 0,
      invoices: [] as any[],
      errors: [] as string[]
    };

    // Generate invoices for each student
    for (const student of students) {
      try {
        // Check if invoice already exists for this student, academic year, and billing period
        const { data: existingInvoice } = await supabase
          .from('fee_invoices')
          .select('id, invoice_number')
          .eq('school_id', schoolId)
          .eq('student_id', student.id)
          .eq('academic_year', validatedData.academic_year)
          .eq('billing_period', validatedData.billing_period)
          .single();

        if (existingInvoice) {
          generationResults.errors.push(
            `Invoice already exists for student ${student.full_name} (${existingInvoice.invoice_number})`
          );
          generationResults.failed_invoices++;
          continue;
        }

        // Get student fee assignments for the academic year
        const { data: studentFees, error: feesError } = await supabase
          .from('student_fees')
          .select(`
            *,
            fee_structures (
              id,
              amount,
              payment_frequency,
              late_fee_amount,
              late_fee_days,
              late_fee_type,
              fee_categories (
                id,
                name,
                description
              )
            )
          `)
          .eq('student_id', student.id)
          .eq('is_active', true)
          .eq('fee_structures.academic_year', validatedData.academic_year);

        if (feesError) {
          console.error(`Error fetching fees for student ${student.full_name}:`, feesError);
          generationResults.errors.push(`Failed to fetch fees for student ${student.full_name}`);
          generationResults.failed_invoices++;
          continue;
        }

        if (!studentFees || studentFees.length === 0) {
          generationResults.errors.push(`No fee structures assigned to student ${student.full_name}`);
          generationResults.failed_invoices++;
          continue;
        }

        // Generate invoice number using the database function
        const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
          .rpc('generate_invoice_number', { p_school_id: schoolId });

        if (invoiceNumberError || !invoiceNumberData) {
          console.error('Error generating invoice number:', invoiceNumberError);
          generationResults.errors.push(`Failed to generate invoice number for student ${student.full_name}`);
          generationResults.failed_invoices++;
          continue;
        }

        // Calculate invoice totals
        let totalAmount = 0;
        let totalDiscountAmount = 0;
        const invoiceItems = [];

        for (const studentFee of studentFees) {
          const feeStructure = studentFee.fee_structures;
          let itemAmount = studentFee.custom_amount || feeStructure.amount;
          let itemDiscountAmount = 0;

          // Apply percentage discount
          if (studentFee.discount_percentage > 0) {
            itemDiscountAmount += itemAmount * (studentFee.discount_percentage / 100);
          }

          // Apply fixed discount
          if (studentFee.discount_amount > 0) {
            itemDiscountAmount += studentFee.discount_amount;
          }

          const finalItemAmount = Math.max(0, itemAmount - itemDiscountAmount);

          invoiceItems.push({
            fee_structure_id: feeStructure.id,
            student_fee_id: studentFee.id,
            description: feeStructure.fee_categories.name,
            quantity: 1,
            unit_amount: itemAmount,
            total_amount: finalItemAmount,
            discount_amount: itemDiscountAmount
          });

          totalAmount += finalItemAmount;
          totalDiscountAmount += itemDiscountAmount;
        }

        // Create the invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('fee_invoices')
          .insert({
            school_id: schoolId,
            student_id: student.id,
            invoice_number: invoiceNumberData,
            academic_year: validatedData.academic_year,
            billing_period: validatedData.billing_period,
            total_amount: totalAmount,
            discount_amount: totalDiscountAmount,
            late_fee_amount: 0,
            paid_amount: 0,
            due_amount: totalAmount,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending'
          })
          .select()
          .single();

        if (invoiceError) {
          console.error(`Error creating invoice for student ${student.full_name}:`, invoiceError);
          generationResults.errors.push(`Failed to create invoice for student ${student.full_name}`);
          generationResults.failed_invoices++;
          continue;
        }

        // Create invoice items
        const { error: itemsError } = await supabase
          .from('fee_invoice_items')
          .insert(
            invoiceItems.map(item => ({
              invoice_id: invoice.id,
              ...item
            }))
          );

        if (itemsError) {
          console.error(`Error creating invoice items for student ${student.full_name}:`, itemsError);
          // Delete the invoice if items failed
          await supabase.from('fee_invoices').delete().eq('id', invoice.id);
          generationResults.errors.push(`Failed to create invoice items for student ${student.full_name}`);
          generationResults.failed_invoices++;
          continue;
        }

        generationResults.invoices.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          student_id: student.id,
          student_name: student.full_name,
          student_admission_no: student.admission_no,
          grade: student.grade,
          section: student.section,
          total_amount: totalAmount,
          discount_amount: totalDiscountAmount,
          due_amount: totalAmount,
          due_date: invoice.due_date,
          items_count: invoiceItems.length
        });

        generationResults.successful_invoices++;

      } catch (error) {
        console.error(`Unexpected error processing student ${student.full_name}:`, error);
        generationResults.errors.push(
          `Unexpected error processing student ${student.full_name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        generationResults.failed_invoices++;
      }
    }

    // TODO: Send notifications if enabled
    if (validatedData.send_notifications && generationResults.successful_invoices > 0) {
      // Implement notification sending logic here
      console.log(`Would send notifications for ${generationResults.successful_invoices} invoices`);
    }

    return NextResponse.json({
      success: true,
      data: generationResults
    }, { status: 201 });

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