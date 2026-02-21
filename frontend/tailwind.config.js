/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Atlas Public Policy brand palette
        atlas: {
          blue: '#004F98',
          lightblue: '#C1DEE9',
          green: '#659637',
          red: '#DD2323',
          gold: '#F4AB00',
          orange: '#F6571D',
          black: '#020211',
        },
        primary: {
          50: '#e6f0fa',
          100: '#C1DEE9',
          200: '#99c6db',
          300: '#6aadd0',
          400: '#3388bf',
          500: '#004F98',
          600: '#004585',
          700: '#003a70',
          800: '#002e5a',
          900: '#002244',
        },
        accent: {
          50: '#f2f8eb',
          100: '#dfecd0',
          200: '#c0d9a1',
          300: '#9ec470',
          400: '#7fb044',
          500: '#659637',
          600: '#52792d',
          700: '#3f5d22',
          800: '#2d4218',
          900: '#1b280e',
        },
      },
    },
  },
  plugins: [],
}
