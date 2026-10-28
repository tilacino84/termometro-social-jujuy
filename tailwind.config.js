/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#070a12',
        surface: '#0e1322',
        card: '#121828',
      },
    },
  },
  plugins: [],
};
