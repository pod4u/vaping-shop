/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          void: '#06040a',
          dark: '#0a0712',
          surface: '#120d20',
          'surface-hover': '#1b1430',
          card: '#140e24',
          border: '#281d45',
          'border-light': '#3b2b64',
        },
        acid: {
          lime: '#d4ff14',
          glow: '#ccff00',
          muted: '#a3cc00',
          dark: '#1e2600',
        },
        vapor: {
          purple: '#7928ca',
          violet: '#5b13ec',
          deep: '#3b0764',
          glow: '#9d4edd',
        },
        navy: {
          DEFAULT: '#1e3a8a',
          deep: '#0f172a',
          surface: '#172554',
          'surface-hover': '#1e3a8a',
          border: '#1e40af',
          'border-light': '#3b82f6',
          glow: '#3b82f6',
          accent: '#60a5fa',
        },
        hybrid: {
          deep: '#020617',
          darker: '#0a0f1a',
          surface: '#0f172a',
          'surface-hover': '#1e293b',
          border: '#1e3a8a',
          'border-light': '#3b82f6',
          glow: '#2563eb',
          'glow-bright': '#3b82f6',
          blue: '#1d4ed8',
          'blue-light:': '#60a5fa',
        },
        // Shadcn CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      backgroundImage: {
        'vapor-glow': 'radial-gradient(circle at 50% 30%, rgba(91, 19, 236, 0.35) 0%, rgba(212, 255, 20, 0.08) 40%, transparent 70%)',
        'navy-glow': 'radial-gradient(circle at 50% 30%, rgba(30, 64, 175, 0.4) 0%, rgba(59, 130, 246, 0.15) 40%, transparent 70%)',
        'acid-gradient': 'linear-gradient(135deg, #d4ff14 0%, #a3e635 100%)',
        'purple-gradient': 'linear-gradient(135deg, #7928ca 0%, #5b13ec 100%)',
        'navy-gradient': 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0a0712 0%, #06040a 100%)',
        'navy-dark-gradient': 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
      },
      boxShadow: {
        'acid': '0 0 25px -5px rgba(212, 255, 20, 0.4)',
        'acid-sm': '0 0 12px -2px rgba(212, 255, 20, 0.3)',
        'vapor': '0 0 35px -5px rgba(91, 19, 236, 0.4)',
        'navy': '0 0 35px -5px rgba(30, 64, 175, 0.5)',
        'navy-sm': '0 0 15px -3px rgba(59, 130, 246, 0.4)',
        'card-glow': '0 8px 32px 0 rgba(91, 19, 236, 0.15)',
        'navy-card-glow': '0 8px 32px 0 rgba(30, 64, 175, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}