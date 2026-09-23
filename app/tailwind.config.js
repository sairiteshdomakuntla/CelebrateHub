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
          DEFAULT: "#0D0D0D",
          card: "#161616",
          input: "#141414",
          muted: "#1A1A1A",
        },
        rose: {
          brand: "#E8956D",
          dim: "rgba(232,149,109,0.12)",
          glow: "rgba(232,149,109,0.45)",
        },
        purple: {
          brand: "#A78BFA",
        },
        border: {
          subtle: "rgba(255,255,255,0.07)",
          faint: "rgba(255,255,255,0.06)",
          rose: "rgba(232,149,109,0.25)",
        },
        text: {
          primary: "#F5F5F5",
          secondary: "#C0C0C0",
          muted: "#6B7280",
          dim: "#4B5563",
          error: "#F87171",
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