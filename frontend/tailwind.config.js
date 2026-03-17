import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#ebfbf6",
          500: "#00a878",
          700: "#027a57"
        },
        ink: "#0f172a",
        ember: "#ff6b35"
      }
    }
  },
  plugins: [forms]
};
