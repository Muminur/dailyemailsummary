/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        glassLight: 'rgba(255, 255, 255, 0.6)',
        glassDark: 'rgba(17, 25, 40, 0.75)'
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}