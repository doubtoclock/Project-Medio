/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: "#0d6cf2",
        "background-light": "#f5f7f8",
        "background-dark": "#101722",
      },

      fontFamily: {
        display: ["Inter", "sans-serif"],
      },

      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },

      boxShadow: {
        glow: "0 0 20px rgba(13,108,242,0.6)",
        "glow-soft": "0 0 40px rgba(13,108,242,0.3)",
      },

      backgroundImage: {
        "medio-gradient":
          "radial-gradient(circle at top left, rgba(13,108,242,0.25), transparent 60%)",
      },
    },
  },

  plugins: [],
};