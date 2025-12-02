import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const paymentGatewaySchema = z.object({
  gateway_provider: z.enum(['razorpay', 'stripe', 'paytm', 'phonepe']),
  is_enabled: z.boolean(),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  webhook_secret: z.string().optional(),
  merchant_id: z.string().optional(),
  account_id: z.string().optional(),
  currency: z.string().default('INR'),
  payment_modes: z.array(z.string()).default(['card', 'netbanking', 'upi', 'wallet']),
  convenience_fee_type: z.enum(['percentage', 'fixed']).default('percentage'),
  convenience_fee_value: z.number().min(0).default(0),
  convenience_fee_bearer: z.enum(['parent', 'school']).default('parent'),
  is_test_mode: z.boolean().default(true),
});

// GET /api/admin/settings/payment-gateway - Get payment gateway settings
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's school and verify admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'school_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch payment gateway settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_gateway_settings')
      .select('*')
      .eq('school_id', userData.school_id);

    if (settingsError) {
      console.error('Error fetching payment gateway settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment gateway settings' },
        { status: 500 }
      );
    }

    // Don't send sensitive data to frontend in list view
    const sanitizedSettings = settings?.map(setting => ({
      id: setting.id,
      gateway_provider: setting.gateway_provider,
      is_enabled: setting.is_enabled,
      currency: setting.currency,
      payment_modes: setting.payment_modes,
      convenience_fee_type: setting.convenience_fee_type,
      convenience_fee_value: setting.convenience_fee_value,
      convenience_fee_bearer: setting.convenience_fee_bearer,
      is_test_mode: setting.is_test_mode,
      created_at: setting.created_at,
      updated_at: setting.updated_at,
    }));

    return NextResponse.json({
      settings: sanitizedSettings || []
    });
  } catch (error) {
    console.error('Error in GET /api/admin/settings/payment-gateway:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/payment-gateway - Create or update payment gateway settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = paymentGatewaySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const gatewayData = validation.data;

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's school and verify admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'school_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Upsert payment gateway settings
    const { data: setting, error: settingError } = await supabase
      .from('payment_gateway_settings')
      .upsert({
        school_id: userData.school_id,
        ...gatewayData,
        updated_by: user.id,
        created_by: user.id,
      }, {
        onConflict: 'school_id,gateway_provider'
      })
      .select()
      .single();

    if (settingError) {
      console.error('Error saving payment gateway settings:', settingError);
      return NextResponse.json(
        { error: 'Failed to save payment gateway settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      setting,
      message: 'Payment gateway settings saved successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/admin/settings/payment-gateway:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
