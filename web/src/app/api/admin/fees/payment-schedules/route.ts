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

// GET - List all payment schedules for a school
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('fee_collection_schedules')
      .select(`
        *,
        fee_schedule_grades (grade),
        fee_schedule_items (
          id,
          fee_category_id,
          amount_override,
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
      .eq('school_id', schoolId)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Error fetching payment schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment schedules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/admin/fees/payment-schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new payment schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_id,
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
      grades,
      fee_items,
      installments,
      reminders
    } = body;

    // Validation
    if (!school_id || !schedule_name || !academic_year || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!grades || grades.length === 0) {
      return NextResponse.json(
        { error: 'At least one grade must be selected' },
        { status: 400 }
      );
    }

    if (!fee_items || fee_items.length === 0) {
      return NextResponse.json(
        { error: 'At least one fee type must be selected' },
        { status: 400 }
      );
    }

    // Create the schedule
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('fee_collection_schedules')
      .insert({
        school_id,
        schedule_name,
        description,
        academic_year,
        due_date,
        grace_period_days: grace_period_days || 0,
        late_fee_applicable: late_fee_applicable !== false,
        late_fee_enabled: late_fee_enabled || false,
        late_fee_type: late_fee_type || null,
        late_fee_amount: late_fee_amount || null,
        late_fee_percentage: late_fee_percentage || null,
        late_fee_max_amount: late_fee_max_amount || null,
        is_installment: is_installment || false,
        installment_count: (is_installment && installments) ? installments.length : 1,
        installment_frequency: (is_installment && installment_frequency) ? installment_frequency : null,
        status: 'active'
      })
      .select()
      .single();

    if (scheduleError) {
      console.error('Error creating schedule:', scheduleError);
      return NextResponse.json(
        { error: 'Failed to create payment schedule' },
        { status: 500 }
      );
    }

    // Add grades
    const gradeInserts = grades.map((grade: string) => ({
      schedule_id: schedule.id,
      grade
    }));

    const { error: gradesError } = await supabaseAdmin
      .from('fee_schedule_grades')
      .insert(gradeInserts);

    if (gradesError) {
      console.error('Error adding grades:', gradesError);
      // Rollback schedule
      await supabaseAdmin
        .from('fee_collection_schedules')
        .delete()
        .eq('id', schedule.id);
      return NextResponse.json(
        { error: 'Failed to add grades to schedule' },
        { status: 500 }
      );
    }

    // Add fee items
    const itemInserts = fee_items.map((item: any) => ({
      schedule_id: schedule.id,
      fee_category_id: item.fee_category_id,
      amount_override: item.amount_override || null,
      is_mandatory: item.is_mandatory !== false
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('fee_schedule_items')
      .insert(itemInserts);

    if (itemsError) {
      console.error('Error adding fee items:', itemsError);
      // Rollback
      await supabaseAdmin
        .from('fee_collection_schedules')
        .delete()
        .eq('id', schedule.id);
      return NextResponse.json(
        { error: 'Failed to add fee items to schedule' },
        { status: 500 }
      );
    }

    // Add installments if this is an installment schedule
    if (is_installment && installments && installments.length > 0) {
      const installmentInserts = installments.map((inst: any) => ({
        schedule_id: schedule.id,
        installment_number: inst.installment_number,
        installment_name: inst.installment_name,
        due_date: inst.due_date,
        percentage: inst.percentage || null,
        fixed_amount: inst.fixed_amount || null,
        grace_period_days: inst.grace_period_days || grace_period_days || 0
      }));

      const { error: installmentsError } = await supabaseAdmin
        .from('fee_schedule_installments')
        .insert(installmentInserts);

      if (installmentsError) {
        console.error('Error adding installments:', installmentsError);
        // Rollback
        await supabaseAdmin
          .from('fee_collection_schedules')
          .delete()
          .eq('id', schedule.id);
        return NextResponse.json(
          { error: 'Failed to add installments to schedule' },
          { status: 500 }
        );
      }
    }

    // Add reminders if provided
    if (reminders && reminders.length > 0) {
      const reminderInserts = reminders
        .filter((r: any) => r.is_active)
        .map((reminder: any) => ({
          schedule_id: schedule.id,
          reminder_type: reminder.reminder_type,
          days_before: reminder.days_before,
          notification_channels: reminder.notification_channels || ['in_app', 'push'],
          custom_message: reminder.custom_message || null,
          is_active: true
        }));

      if (reminderInserts.length > 0) {
        const { error: remindersError } = await supabaseAdmin
          .from('fee_schedule_reminders')
          .insert(reminderInserts);

        if (remindersError) {
          console.error('Error adding reminders:', remindersError);
          // Don't rollback, reminders are optional
        }
      }
    }

    // Initialize payment status for all students
    try {
      await supabaseAdmin.rpc('initialize_payment_status', {
        p_schedule_id: schedule.id
      });

      // Update schedule statistics
      await supabaseAdmin.rpc('update_schedule_statistics', {
        p_schedule_id: schedule.id
      });
    } catch (error) {
      console.error('Error initializing payment status:', error);
      // Don't rollback, this can be done later
    }

    // Fetch the complete schedule with relations
    const { data: completeSchedule } = await supabaseAdmin
      .from('fee_collection_schedules')
      .select(`
        *,
        fee_schedule_grades (grade),
        fee_schedule_items (
          id,
          fee_category_id,
          amount_override,
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
      .eq('id', schedule.id)
      .single();

    return NextResponse.json({
      success: true,
      data: completeSchedule,
      message: 'Payment schedule created successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/admin/fees/payment-schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
