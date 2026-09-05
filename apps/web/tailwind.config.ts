import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1a3a6e",
          gold: "#c8a940",
        },
      },
    },
  },
  plugins: [],
};

export default config;
