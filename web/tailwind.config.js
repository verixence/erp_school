/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('tailwindcss-fluid-type'),
    function({ addUtilities, addComponents }) {
      // Dynamic brand color utilities
      addUtilities({
        '.bg-brand-primary': {
          'background-color': 'var(--c-primary)',
        },
        '.text-brand-primary': {
          'color': 'var(--c-primary)',
        },
        '.border-brand-primary': {
          'border-color': 'var(--c-primary)',
        },
        '.bg-brand-secondary': {
          'background-color': 'var(--c-secondary)',
        },
        '.text-brand-secondary': {
          'color': 'var(--c-secondary)',
        },
        '.bg-brand-accent': {
          'background-color': 'var(--c-accent)',
        },
        '.text-brand-accent': {
          'color': 'var(--c-accent)',
        },
        '.border-brand-accent': {
          'border-color': 'var(--c-accent)',
        },
      });

      // Glassmorphism components
      addComponents({
        '.glassmorphism': {
          'background': 'rgba(255, 255, 255, 0.25)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.18)',
          '@apply dark:bg-zinc-800/40 dark:border-zinc-700/50': {},
        },
        '.glassmorphism-card': {
          'background': 'rgba(255, 255, 255, 0.3)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
          'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
          '@apply dark:bg-zinc-800/50 dark:border-zinc-700/60': {},
        },
      });

      // Tri-color theme utilities
      addUtilities({
        '.bg-primary': {
          'background-color': 'var(--c-primary)',
        },
        '.bg-secondary': {
          'background-color': 'var(--c-secondary)',
        },
        '.bg-accent': {
          'background-color': 'var(--c-accent)',
        },
        '.text-primary': {
          'color': 'var(--c-primary)',
        },
        '.text-secondary': {
          'color': 'var(--c-secondary)',
        },
        '.text-accent': {
          'color': 'var(--c-accent)',
        },
        '.text-primary-fg': {
          'color': 'var(--c-primary-fg)',
        },
        '.text-secondary-fg': {
          'color': 'var(--c-secondary-fg)',
        },
        '.text-accent-fg': {
          'color': 'var(--c-accent-fg)',
        },
        '.border-primary': {
          'border-color': 'var(--c-primary)',
        },
        '.border-secondary': {
          'border-color': 'var(--c-secondary)',
        },
        '.border-accent': {
          'border-color': 'var(--c-accent)',
        },
        '.bg-primary\\/10': {
          'background-color': 'rgb(from var(--c-primary) r g b / 0.1)',
        },
        '.bg-secondary\\/10': {
          'background-color': 'rgb(from var(--c-secondary) r g b / 0.1)',
        },
        '.bg-accent\\/10': {
          'background-color': 'rgb(from var(--c-accent) r g b / 0.1)',
        },
        '.bg-primary\\/20': {
          'background-color': 'rgb(from var(--c-primary) r g b / 0.2)',
        },
        '.bg-secondary\\/20': {
          'background-color': 'rgb(from var(--c-secondary) r g b / 0.2)',
        },
        '.bg-accent\\/20': {
          'background-color': 'rgb(from var(--c-accent) r g b / 0.2)',
        },
        '.hero-gradient': {
          'background': 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))',
        },
        '.hero-gradient-tri': {
          'background': 'linear-gradient(135deg, var(--c-primary), var(--c-secondary), var(--c-accent))',
        },
        '.focus-primary': {
          '&:focus-visible': {
            'outline': '2px solid var(--c-primary)',
            'outline-offset': '2px',
          },
        },
      });
    }
  ],
} 