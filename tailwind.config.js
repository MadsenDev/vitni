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
        // Status colors
        asserted: '#22c55e',
        verified: '#38bdf8',
        unverified: '#fbbf24',
        // Brand colors
        brand: {
          primary: '#1ce5d7', // Logo cyan/turquoise
          'primary-ui': '#22d3ee', // Cyan-400 used in UI
          secondary: '#38bdf8', // Sky blue
          accent: '#10b981', // Emerald
          accent2: '#a855f7', // Fuchsia-500 (purple/pink accent)
          base: '#0f172a' // Slate-950 dark background
        }
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
