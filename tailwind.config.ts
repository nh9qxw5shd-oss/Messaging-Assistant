import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:       "#070B16",
        panel:    "#0D1527",
        panel2:   "#111E33",
        ink:      "#E8EDF5",
        muted:    "#64748B",
        grid:     "#1E2D45",
        accent:   "#E05206",
        "accent-dim": "#B84005",
        good:     "#27AE60",
        warn:     "#F59E0B",
        bad:      "#E74C3C",
      },
      fontFamily: {
        sans:    ["var(--font-body)", "ui-sans-serif", "system-ui"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "serif"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "3px",
        md: "4px",
        lg: "4px",
        xl: "6px",
        "2xl": "8px",
      },
      boxShadow: {
        "orange-glow": "0 0 24px rgba(224,82,6,0.18)",
        "orange-glow-sm": "0 0 10px rgba(224,82,6,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
