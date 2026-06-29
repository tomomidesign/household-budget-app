import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202124",
        muted: "#5f6368",
        line: "#dadce0",
        surface: "#f8fafd",
        primary: "#1a73e8",
        success: "#188038",
        danger: "#d93025",
        amber: "#f9ab00"
      },
      boxShadow: {
        material: "0 1px 2px rgba(60, 64, 67, 0.18), 0 1px 3px rgba(60, 64, 67, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
