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

// POST - Fix notification types constraint
export async function POST(request: NextRequest) {
  try {
    // Drop and recreate the constraint with 'event' type included
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
        ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
        CHECK (type = ANY (ARRAY[
          'announcement'::text,
          'post'::text,
          'system'::text,
          'exam'::text,
          'homework'::text,
          'report'::text,
          'comment'::text,
          'reaction'::text,
          'fee_reminder'::text,
          'event'::text
        ]));
      `
    });

    if (error) {
      console.error('Error fixing notification types:', error);
      return NextResponse.json(
        { error: 'Failed to fix notification types', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification types constraint updated successfully. Event notifications are now enabled.'
    });

  } catch (error) {
    console.error('Fix notification types API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
