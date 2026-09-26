import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Neutral Foundation tokens (NEXUS Design System)
        canvas: {
          DEFAULT: "#F7F5F0",
          secondary: "#EFEBE3",
        },
        surface: {
          DEFAULT: "#FBFAF7",
          raised: "#FFFFFF",
          muted: "#F2EFE9",
          border: "#DDD8CF",
        },
        ink: {
          DEFAULT: "#171717",
          secondary: "#6F6B63",
          muted: "#9A958B",
          faint: "#BCB7AC",
        },
        hairline: {
          DEFAULT: "#DDD8CF",
          subtle: "#E4E0D8",
          darker: "#CFC9BE",
        },
        // Single Primary Accent: Deep Olive
        olive: {
          DEFAULT: "#4D5A45",
          hover: "#3E4937",
          soft: "#EDF0EB",
          subtle: "#DCE2D8",
          text: "#343F2E",
          border: "#C7CEBF",
        },
        // Restrained Semantic Alerts (used sparingly for same-day deadlines)
        terracotta: {
          DEFAULT: "#B5763A",
          soft: "#FBF3EC",
          border: "#E9DACB",
          text: "#8A5424",
        },
        // Legacy system color mappings for backwards compatibility
        background: "#F7F5F0",
        foreground: "#171717",
        card: {
          DEFAULT: "#FBFAF7",
          foreground: "#171717",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#171717",
        },
        primary: {
          DEFAULT: "#4D5A45",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#EFEBE3",
          foreground: "#171717",
        },
        muted: {
          DEFAULT: "#EFEBE3",
          foreground: "#6F6B63",
        },
        accent: {
          DEFAULT: "#EDF0EB",
          foreground: "#4D5A45",
        },
        destructive: {
          DEFAULT: "#B5763A",
          foreground: "#FFFFFF",
        },
        border: "#DDD8CF",
        input: "#DDD8CF",
        ring: "#4D5A45",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["var(--font-serif)", "Newsreader", "Cormorant Garamond", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04)",
        popover: "0 12px 32px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.08)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
