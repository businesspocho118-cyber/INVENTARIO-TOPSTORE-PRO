import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: "#0D0D0D",
          surface: "#161616",
          "surface-2": "#1E1E1E",
          border: "#2A2A2A",
          gold: "#C9A84C",
          "gold-light": "#E8C96A",
          text: "#F0F0EB",
          "text-muted": "#7A7A7A",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
