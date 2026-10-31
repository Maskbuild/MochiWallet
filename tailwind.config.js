/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Mali"', '"Prompt"', 'sans-serif'],
        body: ['"Prompt"', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FFFDF9',
          100: '#FDF8F0',
          200: '#F9EFE2',
          300: '#F2E2CC',
        },
        pastel: {
          pink: '#FFD6E0',
          rose: '#FFACC7',
          mint: '#D4F5E9',
          teal: '#A8E6CF',
          sky: '#D6ECFF',
          blue: '#A9D6FF',
          lavender: '#E8DAFF',
          purple: '#CDB4DB',
          butter: '#FFF2B2',
          peach: '#FFE0C8',
          cocoa: '#5C4B51',
          muted: '#8E7C83',
        }
      },
      boxShadow: {
        'cozy': '0 6px 20px -4px rgba(92, 75, 81, 0.08), 0 2px 6px -1px rgba(92, 75, 81, 0.04)',
        'sticker': '0 4px 0px 0px rgba(92, 75, 81, 0.12)',
      }
    },
  },
  plugins: [],
}

