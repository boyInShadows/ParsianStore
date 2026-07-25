/**
 * Tailwind config -- masterPlan.md §7.2, §7.4.
 *
 * Every color/spacing/radius/shadow/motion value below reads from the CSS
 * custom properties in styles/tokens.css via var(--...). Zero hex literals
 * in this file (CLAUDE.md rule 5) -- if a design need isn't covered by an
 * existing token, add the token in tokens.css first, then reference it here.
 *
 * `screens` duplicates tokens.css's --breakpoint-* values as literal
 * pixels because CSS custom properties cannot drive @media conditions --
 * keep both in sync by hand.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    // Physical separation from the MUI world (masterPlan.md §7.4): once the
    // (admin) route group exists (P1.S6), Tailwind must never process it.
    "!./app/(admin)/**",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    // Replacing (not extending) colors/spacing so only tokenized values are
    // ever available as utility classes -- Tailwind's stock palette and
    // spacing scale are deliberately not present.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      firouzeh: {
        50: "var(--color-firouzeh-50)",
        100: "var(--color-firouzeh-100)",
        200: "var(--color-firouzeh-200)",
        300: "var(--color-firouzeh-300)",
        400: "var(--color-firouzeh-400)",
        500: "var(--color-firouzeh-500)",
        600: "var(--color-firouzeh-600)",
        700: "var(--color-firouzeh-700)",
        800: "var(--color-firouzeh-800)",
        900: "var(--color-firouzeh-900)",
        950: "var(--color-firouzeh-950)",
      },
      signal: {
        50: "var(--color-orange-50)",
        100: "var(--color-orange-100)",
        200: "var(--color-orange-200)",
        300: "var(--color-orange-300)",
        400: "var(--color-orange-400)",
        500: "var(--color-orange-500)",
        600: "var(--color-orange-600)",
        700: "var(--color-orange-700)",
        800: "var(--color-orange-800)",
        900: "var(--color-orange-900)",
        950: "var(--color-orange-950)",
      },
      graphite: {
        0: "var(--color-graphite-0)",
        25: "var(--color-graphite-25)",
        50: "var(--color-graphite-50)",
        100: "var(--color-graphite-100)",
        200: "var(--color-graphite-200)",
        300: "var(--color-graphite-300)",
        400: "var(--color-graphite-400)",
        500: "var(--color-graphite-500)",
        600: "var(--color-graphite-600)",
        700: "var(--color-graphite-700)",
        800: "var(--color-graphite-800)",
        850: "var(--color-graphite-850)",
        900: "var(--color-graphite-900)",
        950: "var(--color-graphite-950)",
        1000: "var(--color-graphite-1000)",
      },
      success: "var(--color-success)",
      warning: "var(--color-warning)",
      danger: "var(--color-danger)",
      info: "var(--color-info)",
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-raised": "var(--surface-raised)",
      text: "var(--text)",
      "text-muted": "var(--text-muted)",
      border: "var(--border)",
      brand: "var(--brand)",
      "brand-solid": "var(--brand-solid)",
      "brand-fg": "var(--brand-fg)",
      cta: "var(--cta)",
      "cta-fg": "var(--cta-fg)",
      focus: "var(--focus)",
    },
    spacing: {
      0: "0px",
      1: "var(--space-1)",
      2: "var(--space-2)",
      3: "var(--space-3)",
      4: "var(--space-4)",
      6: "var(--space-6)",
      8: "var(--space-8)",
      12: "var(--space-12)",
      16: "var(--space-16)",
      20: "var(--space-20)",
      24: "var(--space-24)",
      32: "var(--space-32)",
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
      },
      maxWidth: {
        container: "var(--container-max)",
      },
      // Type scale -- masterPlan.md §6.5. fontFamily/fontWeight compose with
      // these: e.g. `font-display text-display-1` or `font-mono text-data`.
      fontFamily: {
        display: ["var(--font-display)", "Tahoma", "sans-serif"],
        body: ["var(--font-body)", "Tahoma", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-1": [
          "clamp(2.5rem, 6vw, 4.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.02em" },
        ],
        "display-2": ["clamp(2rem, 4.5vw, 3rem)", { lineHeight: "1.15" }],
        h1: ["clamp(1.75rem, 3vw, 2.25rem)", { lineHeight: "1.25" }],
        h2: ["1.5rem", { lineHeight: "1.35" }],
        h3: ["1.25rem", { lineHeight: "1.4" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75" }],
        body: ["1rem", { lineHeight: "1.75" }],
        "body-sm": ["0.875rem", { lineHeight: "1.7" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
        data: ["0.875rem", { letterSpacing: "0.01em" }],
      },
    },
  },
  plugins: [require("tailwindcss-logical"), require("@tailwindcss/typography")],
};
