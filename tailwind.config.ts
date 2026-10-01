import type { Config } from "tailwindcss";

// Hair by Medza palette: one calm blue on white, with neutral greys for text.
//   Primary  Blue   #2152B2 (royal-600)
//   Surface  White  #FFFFFF, soft grey #F6F8FB
//   Text     Black  #0B0B0F (all body text stays black)
// The legacy names (royal / lavender / gold / cream / charcoal) are kept so
// existing markup keeps working; they all resolve to the blue + grey system.
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand blue scale, driven by CSS variables in globals.css.
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
        // Light blue tints for soft backgrounds.
        lavender: {
          DEFAULT: "rgb(var(--r-300) / <alpha-value>)",
          50: "rgb(var(--r-50) / <alpha-value>)",
          100: "rgb(var(--r-100) / <alpha-value>)",
          200: "rgb(var(--r-200) / <alpha-value>)",
          300: "rgb(var(--r-300) / <alpha-value>)",
          400: "rgb(var(--r-400) / <alpha-value>)",
        },
        // Former gold accent, now a quiet blue so nothing "shouts".
        gold: {
          DEFAULT: "rgb(var(--r-500) / <alpha-value>)",
          light: "rgb(var(--r-100) / <alpha-value>)",
          dark: "rgb(var(--r-700) / <alpha-value>)",
        },
        // Text stays black; "soft" and "muted" are only a shade lighter.
        charcoal: {
          DEFAULT: "#0b0b0f",
          soft: "#16161d",
          muted: "#2a2a33",
        },
        cream: {
          DEFAULT: "#ffffff",
          soft: "#f6f8fb",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "Segoe UI", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "Segoe UI", "sans-serif"],
      },
      letterSpacing: {
        luxe: "0.08em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17, 24, 39, 0.06), 0 4px 12px -2px rgba(17, 24, 39, 0.08)",
        card: "0 1px 2px rgba(17, 24, 39, 0.05)",
        glow: "0 0 0 1px rgb(var(--r-600) / 0.25)",
      },
      // Flat fills: the old gradient names now render as solid colours.
      backgroundImage: {
        "royal-gradient": "linear-gradient(rgb(var(--r-700)), rgb(var(--r-700)))",
        "royal-hero": "linear-gradient(rgb(var(--r-900) / 0.55), rgb(var(--r-900) / 0.55))",
        "gold-sheen": "linear-gradient(rgb(var(--r-50)), rgb(var(--r-50)))",
      },
    },
  },
  plugins: [],
};

export default config;
