/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Cairo', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        theme: {
          bg: 'var(--color-theme-bg)',
          secondary: 'var(--color-theme-secondary)',
          text: 'var(--color-theme-text)',
          muted: 'var(--color-theme-muted)',
          border: 'var(--color-theme-border)',
          card: 'var(--color-theme-card)',
        },
        // Deep navy base
        base: {
          950: '#080b16',
          900: '#0b0f1c',
          850: '#0f1426',
          800: '#131a33',
          700: '#1c2440',
          600: '#273056',
        },
        // Accent (teal/cyan)
        accent: {
          50: '#ecfdff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Secondary (emerald for success/streak vibes)
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Warning amber
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Error rose
        error: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        // Gold (for gamification XP)
        gold: {
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
      boxShadow: {
        glow: '0 0 30px -5px rgba(34, 211, 238, 0.3)',
        'glow-gold': '0 0 30px -5px rgba(250, 204, 21, 0.35)',
      },
    },
  },
  plugins: [],
};
