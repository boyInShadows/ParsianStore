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
      // --surface behind a backdrop-filter; the sticky header's ground.
      "surface-translucent": "var(--surface-translucent)",
      // The lit workshop (§6.4). These six do NOT flip with the theme --
      // the hero stage, the interstitial plate and the two video plates keep
      // a dark ground in light mode and gain a frame instead. Anything
      // painted on one of those grounds uses these; anything on a section
      // that follows the theme uses `surface`/`text`/`border`.
      stage: "var(--stage)",
      "stage-border": "var(--stage-border)",
      "stage-text": "var(--stage-text)",
      "stage-text-muted": "var(--stage-text-muted)",
      "stage-text-faint": "var(--stage-text-faint)",
      "stage-link": "var(--stage-link)",
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
      // Marigold as TEXT. `text-cta` is 2.12:1 on --surface -- a fill colour
      // used as ink. Any marigold glyph on a theme-following surface takes
      // this instead (§6.3).
      "cta-ink": "var(--cta-ink)",
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
      // `w-rail` / `basis-rail` -- one card inside a horizontal snap rail.
      // See tokens.css on why this is a named token, not a spacing step.
      width: {
        rail: "var(--rail-card)",
        // `w-tap` -- the square half of `h-tap`, for a control that is round
        // (P14.S9's stage nav). Same token, same reason it is not a spacing
        // step.
        tap: "var(--tap-target)",
      },
      flexBasis: {
        rail: "var(--rail-card)",
      },
      // `h-tap` / `min-h-tap` / `min-w-tap` -- the 44px primary-mobile-control
      // floor (P14.S6). Deliberately NOT added to `spacing`: see tokens.css's
      // --tap-target for why a new spacing step would switch on every dead
      // `p-11`-shaped utility already written in this app.
      height: {
        tap: "var(--tap-target)",
      },
      minHeight: {
        tap: "var(--tap-target)",
      },
      minWidth: {
        tap: "var(--tap-target)",
      },
      // fontFamily/fontSize compose: e.g. `font-display text-display-1` or
      // `font-mono text-data`. `display` resolves to the body face --
      // tokens.css aliases --font-display to --font-body (P14.S1).
      //
      // The three names after next/font's own pair (P15.S3c) are named
      // system Persian-capable faces, not decoration. `display: "optional"`
      // on `bodyFont` (lib/fonts.ts) means a visit that misses the load
      // window keeps whatever this list resolves to for the WHOLE page, so
      // "falls through to a Latin-only face" stopped being a theoretical
      // ~100ms flash and became a real per-visit outcome. Verified on this
      // machine (Windows/Chromium): next/font's generated fallback --
      // `local("Arial")` with an auto-computed size-adjust -- already
      // renders Persian correctly here, because Windows' own Arial carries
      // Arabic-script coverage; `Tahoma` was already next and is Windows'
      // purpose-built Arabic-UI face. Neither of those is installed by
      // default on macOS/iOS or Android, so this adds their platform
      // equivalents explicitly rather than trusting each engine's own
      // last-resort script fallback to pick one silently: `Segoe UI`
      // (Windows 10+, broader Arabic coverage than Tahoma), `Noto Naskh
      // Arabic` / `Noto Sans Arabic` (Android system default), `Geeza Pro`
      // (iOS/macOS). Costs zero bytes -- these are system font names, no
      // file is fetched for a name the OS does not have installed.
      fontFamily: {
        display: [
          "var(--font-display)",
          "Tahoma",
          "Segoe UI",
          "Noto Naskh Arabic",
          "Noto Sans Arabic",
          "Geeza Pro",
          "sans-serif",
        ],
        body: [
          "var(--font-body)",
          "Tahoma",
          "Segoe UI",
          "Noto Naskh Arabic",
          "Noto Sans Arabic",
          "Geeza Pro",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Type scale -- tokens.css owns every value (CLAUDE.md rule 5); this
      // map only composes size + leading + tracking into Tailwind's shape.
      // P14.S1 moved the numbers there and retuned them for Persian: the
      // old display-1 was `clamp(2.5rem, 6vw, 3.5rem)` at line-height 1.10
      // with letter-spacing -0.02em, which is a Latin display setting and
      // the reason every heading read as cramped. See tokens.css for the
      // reasoning and the mobile -> desktop figure behind each clamp().
      fontSize: {
        "display-1": [
          "var(--type-display-1-size)",
          {
            lineHeight: "var(--type-display-1-lh)",
            letterSpacing: "var(--type-display-1-ls)",
          },
        ],
        "display-2": ["var(--type-display-2-size)", { lineHeight: "var(--type-display-2-lh)" }],
        h1: ["var(--type-h1-size)", { lineHeight: "var(--type-h1-lh)" }],
        h2: ["var(--type-h2-size)", { lineHeight: "var(--type-h2-lh)" }],
        h3: ["var(--type-h3-size)", { lineHeight: "var(--type-h3-lh)" }],
        "body-lg": ["var(--type-body-lg-size)", { lineHeight: "var(--type-body-lg-lh)" }],
        body: ["var(--type-body-size)", { lineHeight: "var(--type-body-lh)" }],
        "body-sm": ["var(--type-body-sm-size)", { lineHeight: "var(--type-body-sm-lh)" }],
        caption: [
          "var(--type-caption-size)",
          {
            lineHeight: "var(--type-caption-lh)",
            letterSpacing: "var(--type-caption-ls)",
          },
        ],
        data: [
          "var(--type-data-size)",
          { lineHeight: "var(--type-data-lh)", letterSpacing: "var(--type-data-ls)" },
        ],
      },
    },
  },
  plugins: [require("tailwindcss-logical"), require("@tailwindcss/typography")],
};
