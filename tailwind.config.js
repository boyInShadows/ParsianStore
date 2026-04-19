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
        // Ostad Industrial Palette
        "ostad-blue": "#0B1E33",
        "ostad-gold": "#D4AF37",
        "ostad-rust": "#8B3A3A",
        "ostad-steel": "#2C3539",
        "ostad-concrete": "#F4F4F4",
        "ostad-dark": "#1A1A1A",
        "ostad-success": "#2E5C3E",
      },
      fontFamily: {
        kalameh: ["Kalameh", "sans-serif"],
        titr: ["Titr", "sans-serif"],
        yekan: ["Yekan", "sans-serif"],
        // Semantic aliases for Ostad pattern
        body: ["Kalameh", "sans-serif"],
        heavy: ["Titr", "sans-serif"],
      },
      animation: {
        glint: "glint 1.5s ease-in-out infinite",
        unwrap: "unwrap 0.3s ease-out forwards",
        shake: "shake 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        glint: {
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.4", transform: "scaleX(1.5)" },
        },
        unwrap: {
          "0%": { clipPath: "inset(0 0 0 0)" },
          "100%": { clipPath: "inset(0 0 100% 0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      screens: {
        xs: "475px", // Iranian Android phones
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      boxShadow: {
        // The famous "Cigarette Burn" shadow of Persian workshops
        ostad:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
        "ostad-heavy":
          "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(212, 175, 55, 0.3)",
        "ostad-inner": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
      },
      backgroundImage: {
        "ostad-gradient": "linear-gradient(135deg, #0B1E33 0%, #1A1A1A 100%)",
        "gold-gradient": "linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)",
      },
    },
  },
  plugins: [],
};
