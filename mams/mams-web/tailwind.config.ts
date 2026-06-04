import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1A2878', light: '#2E3F99', bg: '#E8EAF5' },
        accent: { DEFAULT: '#7AC142', dark: '#5A9931' },
        red: { DEFAULT: '#E82C2C', bg: '#fde8e8' },
        amber: { DEFAULT: '#f59e0b', bg: '#fef3c7' },
        green: { DEFAULT: '#73ae25', bg: '#edf7e0' },
        bg: '#f8f9fb',
        surface: '#ffffff',
        surface2: '#f1f3f7',
        border: '#e2e6ed',
        text: { DEFAULT: '#1a1f36', muted: '#4e5d78', subtle: '#8492a6' },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
      },
    },
  },
} satisfies Config;
