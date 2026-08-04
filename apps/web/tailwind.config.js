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
    // Physical separation from the MUI world (masterPlan.md §7.4). Written as
    // "**/(admin)/**" (not "./app/[locale]/(admin)/**") so the literal `[locale]`
    // path segment never has to appear in a glob pattern -- fast-glob would
    // otherwise parse `[locale]` as a character class, not a literal folder name.
    "!./app/**/(admin)/**",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    // Replacing (not extending) colors/spacing so only tokenized values are
    // ever available as utility classes -- Tailwind's stock palette and
    // spacing scale are deliberately not present.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      steel: {
        50: "var(--color-steel-50)",
        100: "var(--color-steel-100)",
        200: "var(--color-steel-200)",
        300: "var(--color-steel-300)",
        400: "var(--color-steel-400)",
        500: "var(--color-steel-500)",
        600: "var(--color-steel-600)",
        700: "var(--color-steel-700)",
        800: "var(--color-steel-800)",
        900: "var(--color-steel-900)",
        950: "var(--color-steel-950)",
      },
      marigold: {
        50: "var(--color-marigold-50)",
        100: "var(--color-marigold-100)",
        200: "var(--color-marigold-200)",
        300: "var(--color-marigold-300)",
        400: "var(--color-marigold-400)",
        500: "var(--color-marigold-500)",
        600: "var(--color-marigold-600)",
        700: "var(--color-marigold-700)",
        800: "var(--color-marigold-800)",
        900: "var(--color-marigold-900)",
        950: "var(--color-marigold-950)",
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
      // Contrast-safe text ON the filled status colors above (§6.4) --
      // white fails AA on success in both themes and on danger in dark.
      "success-fg": "var(--success-fg)",
      "danger-fg": "var(--danger-fg)",
      "info-fg": "var(--info-fg)",
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-raised": "var(--surface-raised)",
      "surface-sunken": "var(--surface-sunken)",
      text: "var(--text)",
      "text-muted": "var(--text-muted)",
      border: "var(--border)",
      // Divider inside a surface -- always lighter than `border`, which is
      // the container edge (§6.8). Gives `border-rule` and `divide-rule`.
      rule: "var(--rule)",
      // §6.3's "Marigold owns prices", finally implemented -- `cta` itself
      // fails contrast as text, so money uses this instead (§6.8).
      price: "var(--price)",
      brand: "var(--brand)",
      // Tinted ground for a brand chip / selected row / rail halo. Exists
      // because `bg-brand/10` generates no CSS -- Tailwind cannot apply an
      // opacity modifier to an opaque var() color (§6.8).
      "brand-subtle": "var(--brand-subtle)",
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
