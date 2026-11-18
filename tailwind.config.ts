import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        primary: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
        },
        teal: "var(--teal)",
        "blue-soft": "var(--blue-soft)",
        status: {
          "green-fg": "var(--status-green-fg)",
          "green-bg": "var(--status-green-bg)",
          "amber-fg": "var(--status-amber-fg)",
          "amber-bg": "var(--status-amber-bg)",
          "red-fg": "var(--status-red-fg)",
          "red-bg": "var(--status-red-bg)",
        },
      },
      borderRadius: {
        card: "12px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
