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
          DEFAULT: "#120F2B",
          card: "#1E1A3F",
          input: "#1E1A3F",
          muted: "#2A2460",
        },
        surface: {
          DEFAULT: "#1E1A3F",
          raised: "#2A2460",
        },
        brand: {
          primary: "#7C5CFF",
          secondary: "#D6307F",
          accent: "#FFC53D",
        },
        border: {
          subtle: "#322C63",
          faint: "#2A2460",
          focus: "#7C5CFF",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#B8B3E0",
          muted: "#B8B3E0",
          dim: "#7C77A6",
          error: "#FF8FA3",
          onAccent: "#1D1745",
        },
        status: {
          success: "#6EE7B7",
          "success-bg": "#123B34",
          warning: "#FFC53D",
          "warning-bg": "#3D2F0F",
          error: "#FF8FA3",
          "error-bg": "#3F1420",
          info: "#8FB4FF",
          "info-bg": "#1B2A55",
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