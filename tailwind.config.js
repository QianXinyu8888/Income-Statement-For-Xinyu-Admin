/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          dark: '#000000',
          card: '#1C1C1E',
          cardBorder: 'rgba(255, 255, 255, 0.1)',
          blue: '#007AFF',
          yellow: '#FFD60A',
          green: '#30D158',
          red: '#FF453A',
        }
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
