/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/renderer/index.html',
    './app/renderer/src/**/*.{ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        asserted: '#22c55e',
        verified: '#38bdf8',
        unverified: '#fbbf24'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
