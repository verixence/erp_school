/**
 * Premium ERP School Theme Configuration
 * Professional, modern design aligned with web app
 * Based on shadcn/ui principles with subtle, sophisticated colors
 */

export const schoolTheme = {
  // Primary Brand Colors - Professional & Trustworthy
  colors: {
    primary: {
      main: '#1E293B', // Slate 800 - Deep, professional
      light: '#334155', // Slate 700
      dark: '#0F172A', // Slate 900
      gradient: ['#1E293B', '#334155'],
      foreground: '#F8FAFC', // Slate 50
    },
    secondary: {
      main: '#F1F5F9', // Slate 100 - Subtle gray
      light: '#F8FAFC', // Slate 50
      dark: '#E2E8F0', // Slate 200
      gradient: ['#F1F5F9', '#F8FAFC'],
    },

    // Role-specific Colors - Subtle, Professional
    teacher: {
      main: '#4F46E5', // Indigo 600 - Professional authority
      light: '#6366F1', // Indigo 500
      dark: '#4338CA', // Indigo 700
      gradient: ['#4F46E5', '#6366F1'],
      lightBg: '#EEF2FF', // Indigo 50
    },
    parent: {
      main: '#7C3AED', // Violet 600 - Elegant, caring
      light: '#8B5CF6', // Violet 500
      dark: '#6D28D9', // Violet 700
      gradient: ['#7C3AED', '#8B5CF6'],
      lightBg: '#F5F3FF', // Violet 50
    },
    student: {
      main: '#0EA5E9', // Sky 500 - Youthful but refined
      light: '#38BDF8', // Sky 400
      dark: '#0284C7', // Sky 600
      gradient: ['#0EA5E9', '#38BDF8'],
      lightBg: '#E0F2FE', // Sky 50
    },

    // Action Colors - Bright & Cheerful
    success: {
      main: '#10B981', // Green
      light: '#34D399',
      bg: '#D1FAE5',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      bg: '#FEF3C7',
    },
    error: {
      main: '#EF4444', // Red
      light: '#F87171',
      bg: '#FEE2E2',
    },
    info: {
      main: '#3B82F6', // Blue
      light: '#60A5FA',
      bg: '#DBEAFE',
    },

    // Functional Colors - Unified Semantic Palette
    attendance: '#10B981', // Success green
    homework: '#F59E0B', // Warning amber
    exams: '#7C3AED', // Violet (matches parent theme)
    marks: '#EF4444', // Error red
    timetable: '#3B82F6', // Info blue
    announcements: '#7C3AED', // Violet
    community: '#14B8A6', // Teal (accent)
    gallery: '#F97316', // Orange (accent)
    calendar: '#3B82F6', // Info blue

    // Neutral Colors - Clean & Modern
    background: {
      main: '#FFFFFF', // Pure white (matches web)
      secondary: '#F9FAFB', // Gray 50
      tertiary: '#F1F5F9', // Slate 100
      card: '#FFFFFF',
    },
    text: {
      primary: '#0F172A', // Slate 900 - Deep, readable
      secondary: '#64748B', // Slate 500
      tertiary: '#94A3B8', // Slate 400
      light: '#CBD5E1', // Slate 300
      white: '#FFFFFF',
    },
    border: {
      light: '#F1F5F9', // Slate 100
      medium: '#E2E8F0', // Slate 200
      dark: '#CBD5E1', // Slate 300
    },
  },

  // Typography - Professional & Readable (Inter font family)
  typography: {
    fonts: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 19,
      '2xl': 21,
      '3xl': 25,
      '4xl': 29,
      '5xl': 33,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing - Consistent with web (8px base)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },

  // Border Radius - Modern & Refined
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  // Shadows - Subtle & Professional (reduced opacity)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },

  // Quick Action Cards Configuration - Subtle, Professional Gradients
  quickActions: {
    attendance: {
      title: 'Attendance',
      emoji: '✅',
      color: '#10B981',
      gradient: ['#10B981', '#14B8A6'], // Emerald to teal (subtle)
      lightBg: '#D1FAE5',
    },
    homework: {
      title: 'Homework',
      emoji: '📚',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#FBBF24'], // Amber gradient (subtle)
      lightBg: '#FEF3C7',
    },
    exams: {
      title: 'Exams',
      emoji: '📝',
      color: '#7C3AED',
      gradient: ['#7C3AED', '#8B5CF6'], // Violet gradient (subtle)
      lightBg: '#F5F3FF',
    },
    marks: {
      title: 'Marks',
      emoji: '⭐',
      color: '#EF4444',
      gradient: ['#EF4444', '#F87171'], // Red gradient (subtle)
      lightBg: '#FEE2E2',
    },
    timetable: {
      title: 'Timetable',
      emoji: '📅',
      color: '#3B82F6',
      gradient: ['#3B82F6', '#60A5FA'], // Blue gradient (subtle)
      lightBg: '#DBEAFE',
    },
    community: {
      title: 'Community',
      emoji: '💬',
      color: '#14B8A6',
      gradient: ['#14B8A6', '#2DD4BF'], // Teal gradient (subtle)
      lightBg: '#CCFBF1',
    },
    announcements: {
      title: 'Announcements',
      emoji: '📢',
      color: '#7C3AED',
      gradient: ['#7C3AED', '#8B5CF6'], // Violet (matches exams)
      lightBg: '#F5F3FF',
    },
    gallery: {
      title: 'Gallery',
      emoji: '📸',
      color: '#F97316',
      gradient: ['#F97316', '#FB923C'], // Orange gradient (accent)
      lightBg: '#FFEDD5',
    },
    onlineClasses: {
      title: 'Online Classes',
      emoji: '🎥',
      color: '#4F46E5',
      gradient: ['#4F46E5', '#6366F1'], // Indigo gradient (matches teacher)
      lightBg: '#EEF2FF',
    },
    calendar: {
      title: 'Calendar',
      emoji: '📆',
      color: '#3B82F6',
      gradient: ['#3B82F6', '#60A5FA'], // Blue (matches timetable)
      lightBg: '#DBEAFE',
    },
    reports: {
      title: 'Reports',
      emoji: '📊',
      color: '#10B981',
      gradient: ['#10B981', '#14B8A6'], // Emerald to teal
      lightBg: '#D1FAE5',
    },
    feedback: {
      title: 'Feedback',
      emoji: '💭',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#FBBF24'], // Amber (matches homework)
      lightBg: '#FEF3C7',
    },
    fees: {
      title: 'Fee Status',
      emoji: '💳',
      color: '#059669',
      gradient: ['#059669', '#10b981'], // Emerald green
      lightBg: '#d1fae5',
    },
  },

  // Animation Durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

export type SchoolTheme = typeof schoolTheme;
