import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/parent/fees/payment-gateway-status - Check if payment gateway is enabled for the school
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's school
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if payment gateway is enabled for this school
    const { data: gatewaySettings, error: gatewayError } = await supabase
      .from('payment_gateway_settings')
      .select('gateway_provider, is_enabled, currency, payment_modes, convenience_fee_type, convenience_fee_value, convenience_fee_bearer, is_test_mode')
      .eq('school_id', userData.school_id)
      .eq('is_enabled', true)
      .single();

    if (gatewayError && gatewayError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error fetching gateway settings:', gatewayError);
      return NextResponse.json(
        { error: 'Failed to check payment gateway status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enabled: !!gatewaySettings,
      gateway: gatewaySettings || null
    });
  } catch (error) {
    console.error('Error in GET /api/parent/fees/payment-gateway-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
