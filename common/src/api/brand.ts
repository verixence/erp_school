import { supabase } from './supabase';

export interface Brand {
  id: string;
  name: string;
  logo: string | null;
  primary: string;
  secondary: string;
  accent: string;
  address: string;
}

export interface SchoolBrand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
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

export function getForegroundColor(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors and white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
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
  // Add null checks and fallbacks for brand colors
  const primary = brand?.primary || '#6366f1';
  const secondary = brand?.secondary || '#8b5cf6';
  const accent = brand?.accent || '#ec4899';

  // Convert hex colors to HSL format for better CSS variable compatibility
  const convertToHSL = (hex: string) => {
    // Add null check and default fallback
    if (!hex || typeof hex !== 'string') {
      hex = '#6366f1'; // Default primary color fallback
    }
    
    // Remove the hash if present
    const color = hex.replace('#', '');
    
    // Validate hex format
    if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
      console.warn(`Invalid hex color: ${hex}, using default`);
      return '99 102 241'; // Default HSL for #6366f1
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

  return {
    '--c-primary': convertToHSL(primary),
    '--c-secondary': convertToHSL(secondary),
    '--c-accent': convertToHSL(accent),
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
  // Add null check for brand
  if (!brand) {
    console.warn('No brand data provided to injectBrandCSS');
    return;
  }
  
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
  try {
    const { data: school, error } = await supabase
      .from('schools')
      .select('id, name, logo_url, address, theme_colors, primary_color, secondary_color, accent_color')
      .eq('id', schoolId)
      .single();

    if (error || !school) {
      console.error('Error fetching school brand:', error);
      return null;
    }

    // Format the address from the JSON object
    const addressParts = [];
    if (school.address?.street) addressParts.push(school.address.street);
    if (school.address?.city) addressParts.push(school.address.city);
    if (school.address?.state) addressParts.push(school.address.state);
    if (school.address?.country) addressParts.push(school.address.country);
    
    const formattedAddress = addressParts.join(', ') || 'School Address';

    // Use the theme_colors object if it exists, otherwise fall back to individual color fields
    const themeColors = school.theme_colors || {};
    const primaryColor = themeColors.primary || school.primary_color || '#6366f1';
    const secondaryColor = themeColors.secondary || school.secondary_color || '#8b5cf6';
    const accentColor = themeColors.accent || school.accent_color || '#ec4899';

    return {
      id: school.id,
      name: school.name,
      logo_url: school.logo_url || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      theme_colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor
      },
      address: formattedAddress,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in getSchoolBrand:', error);
    
    // Return a default brand as fallback
    return {
      id: schoolId,
      name: 'CampusHoster School',
      logo_url: null,
      primary_color: '#6366f1',
      secondary_color: '#8b5cf6',
      accent_color: '#ec4899',
      theme_colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899'
      },
      address: 'Default School Address',
      created_at: new Date().toISOString(),
    };
  }
}

export async function getBrandForSchool(schoolId: string): Promise<Brand | null> {
  const schoolBrand = await getSchoolBrand(schoolId);
  return schoolBrand ? transformToBrand(schoolBrand) : null;
} 