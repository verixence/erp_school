import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { schoolId, confirmationText, userId, confirmationToken } = await request.json();

    // Validate required fields
    if (!schoolId || !confirmationText || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, confirmationText, userId' },
        { status: 400 }
      );
    }

    // Validate confirmation token (could be school name or "DELETE")
    const expectedConfirmations = ['DELETE', 'PERMANENTLY DELETE'];
    if (!expectedConfirmations.includes(confirmationText.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid confirmation text. Please type "DELETE" to confirm.' },
        { status: 400 }
      );
    }

    // Verify user is super admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only super admins can delete schools.' },
        { status: 403 }
      );
    }

    // Get school details before deletion for confirmation
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, status, created_at')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Check if school has users (additional safety check)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)
      .limit(1);

    if (usersError) {
      return NextResponse.json(
        { error: 'Error checking school users' },
        { status: 500 }
      );
    }

    // Call the database function to delete school
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('delete_school_with_audit', {
        p_school_id: schoolId,
        p_deleted_by: userId,
        p_confirmation_token: confirmationToken || confirmationText
      });

    if (deleteError) {
      console.error('School deletion error:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete school: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const result = deleteResult[0];
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Log successful deletion
    console.log(`School "${school.name}" (ID: ${schoolId}) successfully deleted by user ${user.email}`, {
      deletedRecords: result.deleted_records_count,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      deletedSchool: {
        id: school.id,
        name: school.name,
        status: school.status,
        created_at: school.created_at
      },
      deletedRecordsCount: result.deleted_records_count,
      deletedBy: {
        id: user.id,
        email: user.email
      },
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected error in delete school API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 