import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
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

export default config;
