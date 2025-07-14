"use client";

import { createContext, useContext, useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useSchoolBrand } from "@/hooks/use-brand";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: string;
  setTheme: (theme: string) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { data: brand } = useSchoolBrand();

  useEffect(() => {
    if (brand?.theme_colors) {
      const root = document.documentElement;
      const { primary, secondary, accent } = brand.theme_colors;
      
      // Convert hex to HSL and set CSS variables
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--secondary', secondary);
      root.style.setProperty('--accent', accent);
    }
  }, [brand]);

  return (
    <NextThemesProvider attribute="class" forcedTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 