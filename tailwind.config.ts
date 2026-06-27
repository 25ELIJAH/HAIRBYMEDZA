import type { Config } from "tailwindcss";

// Magdalene Medz brand palette
//   Primary   Royal Purple  #6A0DAD
//   Secondary Lavender      #C8A2C8
//   Accent    Soft Gold     #D4AF37
//   Background White         #FFFFFF
//   Text      Charcoal      #1F1F1F
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand colours are driven by CSS variables so the whole site can be
        // re-themed (purple / pink / blue / orange) from the admin in real time.
        royal: {
          50: "rgb(var(--r-50) / <alpha-value>)",
          100: "rgb(var(--r-100) / <alpha-value>)",
          200: "rgb(var(--r-200) / <alpha-value>)",
          300: "rgb(var(--r-300) / <alpha-value>)",
          400: "rgb(var(--r-400) / <alpha-value>)",
          500: "rgb(var(--r-500) / <alpha-value>)",
          600: "rgb(var(--r-600) / <alpha-value>)",
          700: "rgb(var(--r-700) / <alpha-value>)",
          800: "rgb(var(--r-800) / <alpha-value>)",
          900: "rgb(var(--r-900) / <alpha-value>)",
        },
        // Light brand tints (used for soft backgrounds and text on dark gradients).
        lavender: {
          DEFAULT: "rgb(var(--r-300) / <alpha-value>)",
          50: "rgb(var(--r-50) / <alpha-value>)",
          100: "rgb(var(--r-100) / <alpha-value>)",
          200: "rgb(var(--r-200) / <alpha-value>)",
          300: "rgb(var(--r-300) / <alpha-value>)",
          400: "rgb(var(--r-400) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "#d4af37",
          light: "#e6cd72",
          dark: "#b8932a",
        },
        charcoal: {
          DEFAULT: "#1f1f1f",
          soft: "#39343a",
          muted: "#6b6470",
        },
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -20px rgb(var(--r-500) / 0.45)",
        card: "0 6px 28px -10px rgba(31, 31, 31, 0.14)",
        glow: "0 0 0 1px rgb(var(--r-500) / 0.12), 0 16px 44px -16px rgb(var(--r-500) / 0.55)",
      },
      backgroundImage: {
        "royal-gradient":
          "linear-gradient(135deg, rgb(var(--r-400)) 0%, rgb(var(--r-600)) 48%, rgb(var(--r-800)) 100%)",
        "royal-hero":
          "linear-gradient(112deg, rgb(var(--r-900) / 0.94) 0%, rgb(var(--r-600) / 0.72) 48%, rgb(var(--r-400) / 0.32) 100%)",
        "gold-sheen":
          "linear-gradient(135deg, #e6cd72 0%, #d4af37 50%, #b8932a 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
