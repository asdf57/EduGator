/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/frontend/**/*.html',
    './src/backend/**/*.{html,ejs}'
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
}

