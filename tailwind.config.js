// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Parsian Industrial Palette (Research-Optimized)
        "parsian-blue": "#0B1E33", // Trust, Authority, Factory Manual
        "parsian-steel": "#2C3539", // Durability, Neutral Base
        "parsian-gold": "#C4A028", // Muted Gold - Premium, Genuine
        "parsian-rust": "#7A2E2E", // Deep Rust - Warnings Only
        "parsian-concrete": "#EBEAE6", // Warm Workshop Background
        "parsian-dark": "#141414", // Almost Black - High Contrast
        "parsian-engrave": "#1A1A1A", // Zoom Modal Background

        // Functional Extensions
        "parsian-border": "#D1CFC7", // Subtle borders
        "parsian-hover": "#F5F4F0", // Card hover state
      },
      fontFamily: {
        vazir: ["Vazir", "sans-serif"],
        titr: ["Titr", "sans-serif"],
        kalameh: ["Kalameh", "sans-serif"],
        // Semantic Aliases
        body: ["Vazir", "sans-serif"],
        heading: ["Titr", "sans-serif"],
        price: ["Titr", "sans-serif"],
        warning: ["Titr", "sans-serif"],
      },
      fontSize: {
        // Research-backed scale (Base 16px)
        "2xs": ["0.625rem", { lineHeight: "1rem" }], // 10px
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "3xl": ["1.75rem", { lineHeight: "2.25rem" }], // 28px - Optimal for Titr (Research)
        "4xl": ["2rem", { lineHeight: "2.5rem" }], // 32px
        "5xl": ["2.5rem", { lineHeight: "1" }], // 40px
        "6xl": ["3rem", { lineHeight: "1" }], // 48px
      },
      spacing: {
        // Consistent spacing system
        18: "4.5rem",
        22: "5.5rem",
        touch: "2.75rem", // 44px - Minimum tap target
      },
      animation: {
        glint: "glint 2s ease-in-out infinite",
        unwrap: "unwrap 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        shake: "shake 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "zoom-in": "zoomIn 0.2s ease-out",
      },
      keyframes: {
        glint: {
          "0%, 100%": { opacity: "0.05" },
          "50%": { opacity: "0.3", transform: "scaleX(1.3) translateX(10%)" },
        },
        unwrap: {
          "0%": { clipPath: "inset(0 0 0 0)" },
          "100%": { clipPath: "inset(0 0 100% 0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        zoomIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      screens: {
        xs: "475px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      boxShadow: {
        // Parsian Shadow System
        subtle: "0 2px 4px 0 rgba(0, 0, 0, 0.04)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        "card-hover":
          "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
        elevated:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        ostad:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(196, 160, 40, 0.15)",
        "ostad-heavy":
          "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(196, 160, 40, 0.25)",
        "inner-glow": "inset 0 1px 2px 0 rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "parsian-gradient": "linear-gradient(135deg, #0B1E33 0%, #1A1A1A 100%)",
        "gold-gradient": "linear-gradient(135deg, #C4A028 0%, #9E8018 100%)",
        "concrete-gradient":
          "linear-gradient(180deg, #EBEAE6 0%, #E3E1DC 100%)",
        "engrave-gradient":
          "radial-gradient(circle at 30% 30%, #2A2A2A 0%, #0A0A0A 100%)",
      },
      borderRadius: {
        xs: "0.125rem",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      transitionTimingFunction: {
        parsian: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
