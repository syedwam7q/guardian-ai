import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "var(--bg-deep)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        signal: {
          safe: "var(--signal-safe)",
          watch: "var(--signal-watch)",
          block: "var(--signal-block)",
          causal: "var(--signal-causal)",
          info: "var(--signal-info)",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        display: ['"Instrument Serif"', "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
