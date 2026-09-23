/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#F7F7F5",
          card: "#FFFFFF",
          input: "#FFFFFF",
          muted: "#EFEDEA",
        },
        rose: {
          brand: "#1C1C1E",
          dim: "rgba(28,28,30,0.06)",
          glow: "rgba(28,28,30,0.12)",
        },
        accent: {
          DEFAULT: "#9A3B26",
          soft: "#F9EFE9",
          muted: "#C97B5D",
        },
        purple: {
          brand: "#5B5BD6",
        },
        border: {
          subtle: "#E8E6E1",
          faint: "#EFEEEA",
          rose: "rgba(28,28,30,0.16)",
        },
        text: {
          primary: "#1C1C1E",
          secondary: "#3A3A3C",
          muted: "#6E6E73",
          dim: "#A7A7AB",
          error: "#B3261E",
        },
      },
      borderRadius: {
        "2xl": "18px",
        "3xl": "22px",
      },
    },
  },
  plugins: [],
};