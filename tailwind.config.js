/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#38aaf6',
          500: '#2563eb', // Precision Cobalt Blue
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
        obsidian: {
          bg: '#090A0F',
          canvas: '#111318',
          card: '#161922',
          hover: '#1E222D',
          inlay: '#0D0E14',
          border: '#1E2330',
          'border-focus': '#2E3748',
          text: '#F1F5F9',
          muted: '#94A3B8',
          subdued: '#64748B',
        },
        dark: {
          bg: '#090A0F',
          card: '#161922',
          surface: '#111318',
          border: '#1E2330',
          text: '#F1F5F9',
          subtext: '#94A3B8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}

