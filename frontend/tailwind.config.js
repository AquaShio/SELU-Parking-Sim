/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        selu: {
          green: '#00573D',
          dark: '#003626',
          gold: '#FFC72C',
        }
      }
    },
  },
  plugins: [],
}
