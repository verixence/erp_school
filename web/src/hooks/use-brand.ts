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
    queryKey: ["school-brand", user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("logo_url, theme_colors, font_family")
        .eq("id", user?.school_id!)
        .single();

      if (error) throw error;

      return data as SchoolBrand;
    },
    enabled: !!user?.school_id,
  });
} 