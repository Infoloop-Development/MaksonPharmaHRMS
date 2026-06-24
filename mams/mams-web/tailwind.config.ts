import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-brand-primary-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-brand-primary-light-rgb) / <alpha-value>)',
          bg: 'var(--color-primary-bg)',
        },
        accent: { DEFAULT: '#7AC142', dark: '#5A9931' },
        red: { DEFAULT: 'rgb(var(--color-brand-secondary-rgb) / <alpha-value>)', bg: 'var(--color-red-bg)' },
        amber: { DEFAULT: '#f59e0b', bg: 'var(--color-amber-bg)' },
        green: { DEFAULT: '#73ae25', bg: 'var(--color-green-bg)', dark: '#5f9420' },
        'primary-on-bg': 'var(--color-primary-on-bg)',
        'green-on-bg': 'var(--color-pill-green-text)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface2)',
        border: 'var(--color-border)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        link: 'var(--color-link)',
      },
      fontFamily: {
        sans: ['var(--font-brand-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        floating: 'var(--shadow-floating)',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities, theme }) => {
      addUtilities({
        '.shadow-floating': {
          boxShadow: theme('boxShadow.floating'),
        },
      });
    }),
  ],
} satisfies Config;
