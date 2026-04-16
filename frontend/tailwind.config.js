/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          darkest: '#00504E',
          dark: '#006A68',
          accent: '#80D5D2',
          light: '#CCE8E6',
          bg: '#F4FBF9',
        }
      }
    },
  },
  plugins: [],
}
