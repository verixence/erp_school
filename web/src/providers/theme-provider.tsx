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
        // Check if hex is valid before proceeding
        if (!hex || typeof hex !== 'string') {
          return '0 0% 50%'; // Return a default gray color
        }
        
        // Remove the hash if present
        const color = hex.replace('#', '');
        
        // Validate hex color format
        if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
          return '0 0% 50%'; // Return a default gray color for invalid hex
        }
        
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

      // Helper function to adjust lightness
      const adjustLightness = (hsl: string, adjustment: number) => {
        const [h, s, l] = hsl.split(' ').map(val => parseInt(val));
        const newL = Math.max(0, Math.min(100, l + adjustment));
        return `${h} ${s}% ${newL}%`;
      };

      // Convert colors to HSL - only if they exist and are valid
      const primaryHSL = primary ? convertToHSL(primary) : '231 48% 48%'; // Default indigo
      const secondaryHSL = secondary ? convertToHSL(secondary) : '210 40% 96%'; // Default gray
      const accentHSL = accent ? convertToHSL(accent) : '262 83% 58%'; // Default purple
      
      // Set CSS variables for brand colors
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--primary-light', adjustLightness(primaryHSL, 10));
      root.style.setProperty('--primary-dark', adjustLightness(primaryHSL, -10));
      
      root.style.setProperty('--secondary', secondaryHSL);
      root.style.setProperty('--secondary-foreground', '0 0% 100%');
      root.style.setProperty('--accent', accentHSL);
      root.style.setProperty('--accent-foreground', '0 0% 100%');

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
      root.style.setProperty('--ring', primaryHSL);
      root.style.setProperty('--radius', '0.5rem');

      // Set gradient variables
      root.style.setProperty('--gradient-from', `hsl(${primaryHSL})`);
      root.style.setProperty('--gradient-to', `hsl(${adjustLightness(primaryHSL, 10)})`);
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

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 