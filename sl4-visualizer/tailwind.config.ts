import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        panel: "#111113",
        panel2: "#16161a",
        border: "#26262b",
        muted: "#8a8a93",
        text: "#e6e6ea",
        yud: "#60a5fa",
        goe: "#fb923c",
        other: "#9ca3af",
        accent: "#a78bfa",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
