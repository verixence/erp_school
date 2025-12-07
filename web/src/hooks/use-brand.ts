import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase-client";

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface SchoolBrand {
  logo_url?: string;
  theme_colors?: ThemeColors;
  font_family?: string;
}

export function useSchoolBrand() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["school-brand", user?.school_id, user?.role],
    queryFn: async () => {
      // For parents, use the API route that bypasses RLS
      if (user?.role === 'parent') {
        const response = await fetch('/api/parent/school-info');
        if (!response.ok) {
          throw new Error('Failed to fetch school info');
        }
        const data = await response.json();
        return data.primary_school as SchoolBrand;
      }

      // For staff/admin, query directly (they have school_id)
      const { data, error } = await supabase
        .from("schools")
        .select("logo_url, theme_colors, font_family")
        .eq("id", user?.school_id!)
        .single();

      if (error) throw error;

      return data as SchoolBrand;
    },
    enabled: !!user && (!!user?.school_id || user?.role === 'parent'),
  });
} 