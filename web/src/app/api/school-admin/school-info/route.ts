import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/school-admin/school-info - Get school information for school admin
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

    // Get user's school_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.school_id) {
      console.error('Error fetching user school:', userError);
      return NextResponse.json(
        { error: 'School not found for user' },
        { status: 404 }
      );
    }

    // Get school data (using admin client bypasses RLS)
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, logo_url, address, phone_number, email_address, theme_colors, primary_color, secondary_color, accent_color')
      .eq('id', userData.school_id)
      .single();

    if (schoolError) {
      console.error('Error fetching school:', schoolError);
      return NextResponse.json(
        { error: 'Failed to fetch school information' },
        { status: 500 }
      );
    }

    // Format address object to string
    const addressParts = [];
    if (school.address?.street) addressParts.push(school.address.street);
    if (school.address?.city) addressParts.push(school.address.city);
    if (school.address?.state) addressParts.push(school.address.state);
    if (school.address?.country) addressParts.push(school.address.country);

    return NextResponse.json({
      school: {
        ...school,
        address: addressParts.join(', ') || 'School Address'
      }
    });
  } catch (error) {
    console.error('Error in GET /api/school-admin/school-info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
