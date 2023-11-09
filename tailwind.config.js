/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/frontend/**/*.html',
    './src/backend/**/*.{html,ejs}'
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
}

