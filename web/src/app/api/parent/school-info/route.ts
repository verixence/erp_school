import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/parent/school-info - Get school information for parent's children
export async function GET(request: NextRequest) {
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

    // Get school IDs through children (using admin client bypasses RLS)
    const { data: children, error: childrenError } = await supabase
      .from('student_parents')
      .select(`
        students (
          school_id,
          schools (
            id,
            name,
            logo_url,
            address,
            phone_number,
            email_address,
            theme_colors,
            primary_color,
            secondary_color,
            accent_color
          )
        )
      `)
      .eq('parent_id', user.id);

    if (childrenError) {
      console.error('Error fetching children:', childrenError);
      return NextResponse.json(
        { error: 'Failed to fetch school information' },
        { status: 500 }
      );
    }

    // Extract unique schools (parent might have children in multiple schools)
    const schools = children
      ?.map((child: any) => child.students?.schools)
      .filter(Boolean)
      .filter((school, index, self) =>
        index === self.findIndex((s) => s.id === school.id)
      )
      .map((school: any) => {
        // Format address object to string
        const addressParts = [];
        if (school.address?.street) addressParts.push(school.address.street);
        if (school.address?.city) addressParts.push(school.address.city);
        if (school.address?.state) addressParts.push(school.address.state);
        if (school.address?.country) addressParts.push(school.address.country);

        return {
          ...school,
          address: addressParts.join(', ') || 'School Address'
        };
      }) || [];

    return NextResponse.json({
      schools,
      primary_school: schools[0] || null // Most parents have children in one school
    });
  } catch (error) {
    console.error('Error in GET /api/parent/school-info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
