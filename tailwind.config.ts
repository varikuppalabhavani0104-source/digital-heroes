import type { Config } from "tailwindcss";

/**
 * Design tokens — "Tide" palette.
 * ink    = midnight indigo (text, primary surfaces)
 * lagoon = giving / charity (the emotional lead colour)
 * sun    = rewards / prizes
 * fog    = app background
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#16174A", 700: "#2A2C6B", 500: "#5B5D8F", 300: "#A7A9C9", 100: "#E4E5F2" },
        lagoon: { DEFAULT: "#0E9F8E", 700: "#0A7A6D", 100: "#D6F2EE", 50: "#EEF9F7" },
        sun: { DEFAULT: "#FFB547", 700: "#C77F0A", 100: "#FFF0D3" },
        fog: "#F4F5FB",
        danger: { DEFAULT: "#D6455D", 100: "#FCE4E8" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        card: "0 1px 2px rgba(22,23,74,.05), 0 8px 24px -12px rgba(22,23,74,.12)",
        lift: "0 12px 32px -12px rgba(22,23,74,.25)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { rise: "rise .5s cubic-bezier(.2,.7,.2,1) both" },
    },
  },
  plugins: [],
};
export default config;
