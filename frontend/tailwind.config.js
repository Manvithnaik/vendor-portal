/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        accent: {
          50: '#e6f6f0',
          100: '#b3e5d1',
          200: '#80d4b2',
          300: '#4dc393',
          400: '#26b77b',
          500: '#00ab63',
          600: '#009956',
          700: '#008748',
          800: '#00753b',
          900: '#005a2d',
        },
        surface: {
          50: '#fafbfc',
          100: '#f4f6f8',
          200: '#ebeef2',
          300: '#dde1e7',
        },
        warm: {
          400: '#e8a87c',
          500: '#d4845e',
          600: '#c06040',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        'elevated': '0 4px 24px -4px rgba(16, 42, 67, 0.12)',
      }
    },
  },
  plugins: [],
}
