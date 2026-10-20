/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        earist: {
          crimson: '#800020',
          dark: '#580016',
          light: '#9e1b32',
          gold: '#F59E0B',
          amber: '#D97706',
          goldLight: '#FEF3C7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
