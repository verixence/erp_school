import { supabase } from './supabase';

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  primary: string;
  secondary: string;
  accent: string;
  address: string;
}

export interface SchoolBrand {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  address: string;
  created_at: string;
}

// Utility function to determine if a color is light or dark
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Calculate luminance using the formula for perceived brightness
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Utility function to get appropriate foreground color (white or black) based on background
function getForegroundColor(hex: string): string {
  return isLight(hex) ? '#000000' : '#ffffff';
}

// Utility function to lighten a hex color by a percentage
function lightenColor(hex: string, percent: number): string {
  // Remove the hash if present
  const color = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate new RGB values
  const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

export function generateThemeVars(brand: Brand): Record<string, string> {
  const primary = brand.primary;
  const secondary = brand.secondary;
  const accent = brand.accent;

  return {
    '--c-primary': primary,
    '--c-secondary': secondary,
    '--c-accent': accent,
    '--c-primary-fg': getForegroundColor(primary),
    '--c-secondary-fg': getForegroundColor(secondary),
    '--c-accent-fg': getForegroundColor(accent),
  };
}

export function generateThemeCSS(brand: Brand): string {
  const vars = generateThemeVars(brand);
  const cssVars = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${cssVars}\n}`;
}

export function injectBrandCSS(brand: Brand) {
  // Remove existing brand styles
  const existingStyle = document.getElementById('brand-theme');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate and inject new CSS
  const css = generateThemeCSS(brand);
  const style = document.createElement('style');
  style.id = 'brand-theme';
  style.textContent = css;
  document.head.appendChild(style);
}

export function transformToBrand(schoolBrand: SchoolBrand): Brand {
  return {
    id: schoolBrand.id,
    name: schoolBrand.name,
    logo: schoolBrand.logo_url,
    primary: schoolBrand.primary_color,
    secondary: schoolBrand.secondary_color,
    accent: schoolBrand.accent_color,
    address: schoolBrand.address,
  };
}

export async function getSchoolBrand(schoolId: string): Promise<SchoolBrand | null> {
  // This would typically fetch from your database
  // For now, return mock data
  const mockBrands: Record<string, SchoolBrand> = {
    '1': {
      id: '1',
      name: 'Green Valley School',
      primary_color: '#10b981',
      secondary_color: '#34d399',
      accent_color: '#6ee7b7',
      address: '123 Education Lane, Knowledge City',
      created_at: new Date().toISOString(),
    },
    '2': {
      id: '2',
      name: 'Sunrise Academy',
      primary_color: '#ef4444',
      secondary_color: '#f87171',
      accent_color: '#fca5a5',
      address: '456 Learning Ave, Wisdom Town',
      created_at: new Date().toISOString(),
    },
    '3': {
      id: '3',
      name: 'Blue Ridge Institute',
      primary_color: '#3b82f6',
      secondary_color: '#60a5fa',
      accent_color: '#93c5fd',
      address: '789 Scholar St, Academic Heights',
      created_at: new Date().toISOString(),
    },
  };

  // Return the school brand if it exists, otherwise return a default brand
  return mockBrands[schoolId] || {
    id: schoolId,
    name: 'CampusHoster School',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    accent_color: '#ec4899',
    address: 'Default School Address',
    created_at: new Date().toISOString(),
  };
}

export async function getBrandForSchool(schoolId: string): Promise<Brand | null> {
  const schoolBrand = await getSchoolBrand(schoolId);
  return schoolBrand ? transformToBrand(schoolBrand) : null;
} 