import { supabase } from './supabase';

export type SchoolBrand = {
  logo_url: string | null;
  name: string;
  theme_colors: Record<string, any>;
  address: Record<string, any>;
  website_url: string | null;
  principal_name: string | null;
  phone_number: string | null;
  email_address: string | null;
};

export async function getSchoolBrand(schoolId: string): Promise<SchoolBrand | null> {
  const { data, error } = await supabase
    .from('schools')
    .select(`
      name,
      logo_url,
      theme_colors,
      address,
      website_url,
      principal_name,
      phone_number,
      email_address
    `)
    .eq('id', schoolId)
    .single();

  if (error) {
    console.error('Error fetching school brand:', error);
    return null;
  }

  return data;
} 