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
          DEFAULT: "#c8a24a",
          light: "#e7cd86",
          dark: "#a07d2c",
        },
        charcoal: {
          DEFAULT: "#191016",
          soft: "#3a2f38",
          muted: "#7a6f78",
        },
        cream: {
          DEFAULT: "#f8f4ee",
          soft: "#f2ebe1",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "Segoe UI", "sans-serif"],
      },
      letterSpacing: {
        luxe: "0.28em",
      },
      boxShadow: {
        soft: "0 24px 60px -24px rgba(25, 16, 22, 0.35)",
        card: "0 10px 40px -18px rgba(25, 16, 22, 0.22)",
        glow: "0 0 0 1px rgb(var(--r-500) / 0.10), 0 20px 50px -18px rgb(var(--r-700) / 0.5)",
      },
      backgroundImage: {
        "royal-gradient":
          "linear-gradient(135deg, rgb(var(--r-600)) 0%, rgb(var(--r-800)) 55%, rgb(var(--r-900)) 100%)",
        "royal-hero":
          "linear-gradient(120deg, rgb(var(--r-900) / 0.92) 0%, rgb(var(--r-900) / 0.70) 42%, rgb(var(--r-700) / 0.34) 100%)",
        "gold-sheen":
          "linear-gradient(135deg, #e7cd86 0%, #c8a24a 50%, #a07d2c 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
