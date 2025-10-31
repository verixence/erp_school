import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Get a specific payment schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('fee_collection_schedules')
      .select(`
        *,
        fee_schedule_grades (grade),
        fee_schedule_items (
          id,
          fee_category_id,
          amount_override,
          is_mandatory,
          fee_categories (id, name, description)
        ),
        fee_schedule_reminders (
          id,
          reminder_type,
          days_before,
          notification_channels,
          custom_message,
          is_active
        ),
        fee_schedule_installments (
          id,
          installment_number,
          installment_name,
          due_date,
          percentage,
          fixed_amount,
          grace_period_days
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching payment schedule:', error);
      return NextResponse.json(
        { error: 'Payment schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/admin/fees/payment-schedules/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a payment schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      schedule_name,
      description,
      academic_year,
      due_date,
      grace_period_days,
      late_fee_applicable,
      late_fee_enabled,
      late_fee_type,
      late_fee_amount,
      late_fee_percentage,
      late_fee_max_amount,
      is_installment,
      installment_frequency,
      status,
      grades,
      fee_items,
      installments,
      reminders
    } = body;

    // Update schedule
    const { error: updateError } = await supabaseAdmin
      .from('fee_collection_schedules')
      .update({
        schedule_name,
        description,
        academic_year,
        due_date,
        grace_period_days,
        late_fee_applicable,
        late_fee_enabled: late_fee_enabled || false,
        late_fee_type: late_fee_type || null,
        late_fee_amount: late_fee_amount || null,
        late_fee_percentage: late_fee_percentage || null,
        late_fee_max_amount: late_fee_max_amount || null,
        is_installment: is_installment || false,
        installment_count: (is_installment && installments) ? installments.length : 1,
        installment_frequency: (is_installment && installment_frequency) ? installment_frequency : null,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating schedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment schedule' },
        { status: 500 }
      );
    }

    // Update grades if provided
    if (grades) {
      // Delete existing
      await supabaseAdmin
        .from('fee_schedule_grades')
        .delete()
        .eq('schedule_id', id);

      // Insert new
      const gradeInserts = grades.map((grade: string) => ({
        schedule_id: id,
        grade
      }));

      await supabaseAdmin
        .from('fee_schedule_grades')
        .insert(gradeInserts);
    }

    // Update fee items if provided
    if (fee_items) {
      // Delete existing
      await supabaseAdmin
        .from('fee_schedule_items')
        .delete()
        .eq('schedule_id', id);

      // Insert new
      const itemInserts = fee_items.map((item: any) => ({
        schedule_id: id,
        fee_category_id: item.fee_category_id,
        amount_override: item.amount_override || null,
        is_mandatory: item.is_mandatory !== false
      }));

      await supabaseAdmin
        .from('fee_schedule_items')
        .insert(itemInserts);
    }

    // Update installments if provided
    if (is_installment && installments) {
      // Delete existing installments
      await supabaseAdmin
        .from('fee_schedule_installments')
        .delete()
        .eq('schedule_id', id);

      // Insert new installments
      if (installments.length > 0) {
        const installmentInserts = installments.map((inst: any) => ({
          schedule_id: id,
          installment_number: inst.installment_number,
          installment_name: inst.installment_name,
          due_date: inst.due_date,
          percentage: inst.percentage || null,
          fixed_amount: inst.fixed_amount || null,
          grace_period_days: inst.grace_period_days || grace_period_days || 0
        }));

        await supabaseAdmin
          .from('fee_schedule_installments')
          .insert(installmentInserts);
      }
    }

    // Update reminders if provided
    if (reminders) {
      // Delete existing
      await supabaseAdmin
        .from('fee_schedule_reminders')
        .delete()
        .eq('schedule_id', id);

      // Insert new (only active ones)
      const activeReminders = reminders.filter((r: any) => r.is_active);
      if (activeReminders.length > 0) {
        const reminderInserts = activeReminders.map((reminder: any) => ({
          schedule_id: id,
          reminder_type: reminder.reminder_type,
          days_before: reminder.days_before,
          notification_channels: reminder.notification_channels || ['in_app', 'push'],
          custom_message: reminder.custom_message || null,
          is_active: true
        }));

        await supabaseAdmin
          .from('fee_schedule_reminders')
          .insert(reminderInserts);
      }
    }

    // Reinitialize payment status if grades or fees changed
    if (grades || fee_items) {
      try {
        await supabaseAdmin.rpc('initialize_payment_status', {
          p_schedule_id: id
        });

        await supabaseAdmin.rpc('update_schedule_statistics', {
          p_schedule_id: id
        });
      } catch (error) {
        console.error('Error updating payment status:', error);
      }
    }

    // Fetch updated schedule
    const { data } = await supabaseAdmin
      .from('fee_collection_schedules')
      .select(`
        *,
        fee_schedule_grades (grade),
        fee_schedule_items (
          id,
          fee_category_id,
          amount_override,
          is_mandatory,
          fee_categories (id, name)
        ),
        fee_schedule_reminders (
          id,
          reminder_type,
          days_before,
          notification_channels,
          is_active,
          custom_message
        ),
        fee_schedule_installments (
          id,
          installment_number,
          installment_name,
          due_date,
          percentage,
          fixed_amount,
          grace_period_days
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      data,
      message: 'Payment schedule updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/fees/payment-schedules/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a payment schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // The database will cascade delete related records
    const { error } = await supabaseAdmin
      .from('fee_collection_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json(
        { error: 'Failed to delete payment schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/fees/payment-schedules/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
