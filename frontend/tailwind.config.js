/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }],   // Era text-sm (14px)
        sm: ['1rem', { lineHeight: '1.5rem' }],        // Era text-base (16px)
        base: ['1.125rem', { lineHeight: '1.75rem' }], // Era text-lg (18px)
        lg: ['1.25rem', { lineHeight: '1.75rem' }],    // Era text-xl (20px)
        xl: ['1.5rem', { lineHeight: '2rem' }],        // Era text-2xl (24px)
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }],// Era text-3xl (30px)
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }],  // Era text-4xl (36px)
        '4xl': ['3rem', { lineHeight: '1' }],          // Era text-5xl (48px)
        '5xl': ['3.75rem', { lineHeight: '1' }],       // Era text-6xl (60px)
      },
      colors: {
        brand: {
          900: '#00504E',
          800: '#006A68',
          500: '#CCE8E6',
          300: '#d1fae5',
          200: '#f0faf9',
          100: '#FFFFFF',
          50: '#F4FBF9',
        },
        neutral: {
          900: '#161D1C',
          800: '#324B4A',
          700: '#3F4948',
          600: '#4A6362',
          500: '#6F7978',
          400: '#BEC9C7',
          300: '#B0CCCA',
          200: '#DAE5E3',
          100: '#DDE4E3',
          50: '#EFF5F4',
        },
        feedback: {
          success: { DEFAULT: '#049A59', dark: '#0A7659', clean: '#d1fae5' },
          error: { DEFAULT: '#BA1A1A', dark: '#93000A', light: '#FFDAD6' },
          info: { DEFAULT: '#324863', light: '#D2E4FF' },
          warning: { DEFAULT: '#FF9500', light: '#FFF3E0' }
        }
      }
    },
  },
  plugins: [],
}
