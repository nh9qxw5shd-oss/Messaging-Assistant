import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg:       "var(--color-bg)",
        panel:    "var(--color-panel)",
        panel2:   "var(--color-panel2)",
        ink:      "var(--color-ink)",
        muted:    "var(--color-muted)",
        grid:     "var(--color-grid)",
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
        DEFAULT: "8px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
      },
      boxShadow: {
        "orange-glow":    "0 0 24px rgba(224,82,6,0.22)",
        "orange-glow-sm": "0 0 12px rgba(224,82,6,0.16)",
        "lift":           "0 4px 20px rgba(0,0,0,0.30)",
        "lift-sm":        "0 2px 10px rgba(0,0,0,0.20)",
      },
      animation: {
        "fade-in":  "fadeIn 0.18s ease-out both",
        "fade-up":  "fadeUp 0.22s ease-out both",
        "shimmer":  "shimmer 1.6s linear infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(224,82,6,0.16)" },
          "50%":       { boxShadow: "0 0 24px rgba(224,82,6,0.34)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
