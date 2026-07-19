import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F5F0E8",
          dark: "#E8E0D4",
        },
        ink: {
          DEFAULT: "#2C2C2C",
          muted: "#6B6560",
          light: "#9A948C",
        },
        vinyl: {
          DEFAULT: "#1A1A1A",
          groove: "#2A2A2A",
        },
        accent: {
          DEFAULT: "#D4843A",
          warm: "#E8A84C",
          dark: "#B86A28",
        },
        mood: {
          happy: "#D4843A",
          calm: "#7A9E7E",
          low: "#8B7EC8",
          sad: "#6B7B8C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "paper-grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "spin-slow-paused": "spin 3s linear infinite",
      },
      boxShadow: {
        vinyl: "0 4px 20px rgba(0,0,0,0.3), inset 0 0 30px rgba(255,255,255,0.05)",
        turntable: "0 8px 32px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
