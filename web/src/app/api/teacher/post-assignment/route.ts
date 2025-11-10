import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAssignmentNotification } from '@/lib/push-notifications';

// Environment check
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      due_date,
      subject_id,
      class_id,
      school_id,
      teacher_id,
      file_url,
      total_marks
    } = body;

    // Validate required fields
    if (!title || !due_date || !class_id || !school_id || !teacher_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Create the assignment in database
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('homework')
      .insert({
        title,
        description,
        due_date,
        subject_id,
        class_id,
        school_id,
        teacher_id,
        file_url,
        total_marks,
        status: 'active'
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }

    // 2. Get all students in the class
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('student_classes')
      .select('student_id')
      .eq('class_id', class_id);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      // Assignment created but notification will fail
    }

    // 3. Send push notifications to all students (async, don't block response)
    if (students && students.length > 0) {
      const studentIds = students.map(s => s.student_id);

      // Format due date
      const dueDate = new Date(due_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Send notification asynchronously
      sendAssignmentNotification(
        school_id,
        title,
        dueDate,
        assignment.id,
        studentIds
      )
        .then(result => {
          console.log(`Assignment notification sent: ${result.sent} success, ${result.failed} failed`);
        })
        .catch(error => {
          console.error('Error sending assignment notification:', error);
        });
    }

    return NextResponse.json({
      success: true,
      assignment,
      notificationsSent: students?.length || 0
    });

  } catch (error) {
    console.error('Error in post-assignment:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
