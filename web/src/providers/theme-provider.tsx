"use client";

import { createContext, useContext, useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useSchoolBrand } from "@/hooks/use-brand";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: string;
  enableSystem?: boolean;
};

const ThemeProviderContext = createContext<{ theme?: string }>({});

export function ThemeProvider({ 
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = false,
}: ThemeProviderProps) {
  const { data: brand } = useSchoolBrand();

  useEffect(() => {
    if (brand?.theme_colors) {
      const root = document.documentElement;
      const { primary, secondary, accent } = brand.theme_colors;
      
      // Convert hex colors to HSL format
      const convertToHSL = (hex: string) => {
        // Remove the hash if present
        const color = hex.replace('#', '');
        
        // Parse RGB values
        const r = parseInt(color.substr(0, 2), 16) / 255;
        const g = parseInt(color.substr(2, 2), 16) / 255;
        const b = parseInt(color.substr(4, 2), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          
          h /= 6;
        }

        // Convert to degrees and percentages
        const hDeg = Math.round(h * 360);
        const sPct = Math.round(s * 100);
        const lPct = Math.round(l * 100);

        return `${hDeg} ${sPct}% ${lPct}%`;
      };

      // Set CSS variables for brand colors
      root.style.setProperty('--primary', convertToHSL(primary));
      root.style.setProperty('--primary-foreground', convertToHSL(getForegroundColor(primary)));
      root.style.setProperty('--secondary', convertToHSL(secondary));
      root.style.setProperty('--secondary-foreground', convertToHSL(getForegroundColor(secondary)));
      root.style.setProperty('--accent', convertToHSL(accent));
      root.style.setProperty('--accent-foreground', convertToHSL(getForegroundColor(accent)));

      // Set additional CSS variables for consistent UI
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '222.2 84% 4.9%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '222.2 84% 4.9%');
      root.style.setProperty('--popover', '0 0% 100%');
      root.style.setProperty('--popover-foreground', '222.2 84% 4.9%');
      root.style.setProperty('--muted', '210 40% 96.1%');
      root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
      root.style.setProperty('--destructive', '0 84.2% 60.2%');
      root.style.setProperty('--destructive-foreground', '210 40% 98%');
      root.style.setProperty('--border', '214.3 31.8% 91.4%');
      root.style.setProperty('--input', '214.3 31.8% 91.4%');
      root.style.setProperty('--ring', convertToHSL(primary));
      root.style.setProperty('--radius', '0.5rem');
    }
  }, [brand]);

  return (
    <ThemeProviderContext.Provider value={{ theme: defaultTheme }}>
      <NextThemesProvider 
        attribute={attribute}
        defaultTheme={defaultTheme}
        enableSystem={enableSystem}
      >
        {children}
      </NextThemesProvider>
    </ThemeProviderContext.Provider>
  );
}

// Helper function to determine foreground color based on background color
function getForegroundColor(backgroundColor: string): string {
  // Remove the hash if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 