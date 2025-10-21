/**
 * Dark Mode Theme Configuration
 * Professional dark theme for ERP School mobile app
 * Follows iOS/Material Design dark mode best practices
 */

export const darkTheme = {
  // Primary Brand Colors - Adjusted for dark mode
  colors: {
    primary: {
      main: '#334155', // Slate 700 - Softer for dark
      light: '#475569', // Slate 600
      dark: '#1E293B', // Slate 800
      gradient: ['#334155', '#475569'],
      foreground: '#F8FAFC', // Slate 50
    },
    secondary: {
      main: '#1E293B', // Slate 800 - Dark surfaces
      light: '#334155', // Slate 700
      dark: '#0F172A', // Slate 900
      gradient: ['#1E293B', '#334155'],
    },

    // Role-specific Colors - Slightly brighter for dark backgrounds
    teacher: {
      main: '#6366F1', // Indigo 500 - Brighter for visibility
      light: '#818CF8', // Indigo 400
      dark: '#4F46E5', // Indigo 600
      gradient: ['#6366F1', '#818CF8'],
      lightBg: '#312E81', // Indigo 900 - Dark background
    },
    parent: {
      main: '#8B5CF6', // Violet 500 - Brighter for visibility
      light: '#A78BFA', // Violet 400
      dark: '#7C3AED', // Violet 600
      gradient: ['#8B5CF6', '#A78BFA'],
      lightBg: '#4C1D95', // Violet 900 - Dark background
    },
    student: {
      main: '#38BDF8', // Sky 400 - Brighter for visibility
      light: '#7DD3FC', // Sky 300
      dark: '#0EA5E9', // Sky 500
      gradient: ['#38BDF8', '#7DD3FC'],
      lightBg: '#0C4A6E', // Sky 900 - Dark background
    },

    // Action Colors - Adjusted for dark mode
    success: {
      main: '#34D399', // Emerald 400 - Brighter
      light: '#6EE7B7', // Emerald 300
      bg: '#064E3B', // Emerald 900 - Dark background
    },
    warning: {
      main: '#FBBF24', // Amber 400 - Brighter
      light: '#FCD34D', // Amber 300
      bg: '#78350F', // Amber 900 - Dark background
    },
    error: {
      main: '#F87171', // Red 400 - Brighter
      light: '#FCA5A5', // Red 300
      bg: '#7F1D1D', // Red 900 - Dark background
    },
    info: {
      main: '#60A5FA', // Blue 400 - Brighter
      light: '#93C5FD', // Blue 300
      bg: '#1E3A8A', // Blue 900 - Dark background
    },

    // Functional Colors - Dark mode adjusted
    attendance: '#34D399', // Success green (brighter)
    homework: '#FBBF24', // Warning amber (brighter)
    exams: '#8B5CF6', // Violet (brighter)
    marks: '#F87171', // Error red (brighter)
    timetable: '#60A5FA', // Info blue (brighter)
    announcements: '#8B5CF6', // Violet (brighter)
    community: '#2DD4BF', // Teal 400 (brighter)
    gallery: '#FB923C', // Orange 400 (brighter)
    calendar: '#60A5FA', // Info blue (brighter)

    // Neutral Colors - Dark mode palette
    background: {
      main: '#0F172A', // Slate 900 - True dark
      secondary: '#1E293B', // Slate 800 - Elevated surfaces
      tertiary: '#334155', // Slate 700 - Higher elevation
      card: '#1E293B', // Slate 800 - Card backgrounds
    },
    text: {
      primary: '#F8FAFC', // Slate 50 - High contrast white
      secondary: '#CBD5E1', // Slate 300 - Medium contrast
      tertiary: '#94A3B8', // Slate 400 - Low contrast
      light: '#64748B', // Slate 500 - Subtle text
      white: '#FFFFFF',
    },
    border: {
      light: '#334155', // Slate 700 - Subtle borders
      medium: '#475569', // Slate 600 - Medium borders
      dark: '#64748B', // Slate 500 - Strong borders
    },
  },

  // Typography - Same as light mode
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

  // Spacing - Same as light mode
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

  // Border Radius - Same as light mode
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  // Shadows - Darker and more subtle for dark mode
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
  },

  // Quick Action Cards Configuration - Dark mode colors
  quickActions: {
    attendance: {
      title: 'Attendance',
      color: '#34D399',
      gradient: ['#34D399', '#2DD4BF'],
      lightBg: '#064E3B',
    },
    homework: {
      title: 'Homework',
      color: '#FBBF24',
      gradient: ['#FBBF24', '#FCD34D'],
      lightBg: '#78350F',
    },
    exams: {
      title: 'Exams',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A78BFA'],
      lightBg: '#4C1D95',
    },
    marks: {
      title: 'Marks',
      color: '#F87171',
      gradient: ['#F87171', '#FCA5A5'],
      lightBg: '#7F1D1D',
    },
    timetable: {
      title: 'Timetable',
      color: '#60A5FA',
      gradient: ['#60A5FA', '#93C5FD'],
      lightBg: '#1E3A8A',
    },
    community: {
      title: 'Community',
      color: '#2DD4BF',
      gradient: ['#2DD4BF', '#5EEAD4'],
      lightBg: '#134E4A',
    },
    announcements: {
      title: 'Announcements',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A78BFA'],
      lightBg: '#4C1D95',
    },
    gallery: {
      title: 'Gallery',
      color: '#FB923C',
      gradient: ['#FB923C', '#FDBA74'],
      lightBg: '#7C2D12',
    },
    onlineClasses: {
      title: 'Online Classes',
      color: '#6366F1',
      gradient: ['#6366F1', '#818CF8'],
      lightBg: '#312E81',
    },
    calendar: {
      title: 'Calendar',
      color: '#60A5FA',
      gradient: ['#60A5FA', '#93C5FD'],
      lightBg: '#1E3A8A',
    },
    reports: {
      title: 'Reports',
      color: '#34D399',
      gradient: ['#34D399', '#2DD4BF'],
      lightBg: '#064E3B',
    },
    feedback: {
      title: 'Feedback',
      color: '#FBBF24',
      gradient: ['#FBBF24', '#FCD34D'],
      lightBg: '#78350F',
    },
    fees: {
      title: 'Fee Status',
      color: '#10b981',
      gradient: ['#10b981', '#34d399'],
      lightBg: '#064e3b',
    },
  },

  // Animation Durations - Same as light mode
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

export type DarkTheme = typeof darkTheme;
