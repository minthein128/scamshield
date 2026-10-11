/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          navy: '#0F1B2D',
          slate: '#1E293B',
        },
        danger: {
          DEFAULT: '#C2410C',
          dark: '#9A3412',
          light: '#FDE4D3',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        safe: {
          DEFAULT: '#059669',
          light: '#D1FAE5',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
