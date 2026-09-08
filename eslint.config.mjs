import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import noGraphiteUtility from "./eslint-rules/no-graphite-utility.mjs";
import noPhysicalDirection from "./eslint-rules/no-physical-direction.mjs";
import noRawHex from "./eslint-rules/no-raw-hex.mjs";

const local = {
  rules: {
    "no-graphite-utility": noGraphiteUtility,
    "no-physical-direction": noPhysicalDirection,
    "no-raw-hex": noRawHex,
  },
};

const webFiles = ["apps/web/**/*.{ts,tsx}"];

export default tseslint.config(
  {
    ignores: [
      "legacy/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/next-env.d.ts",
      // Rule source files hold banned-token strings as data, not usage --
      // linting them against their own rule is a guaranteed false positive.
      "eslint-rules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { local },
    rules: {
      "local/no-physical-direction": "error",
      "local/no-raw-hex": "error",
      // The graphite ramp does not flip with [data-theme]; reaching for it in
      // app code is how the site ended up with a light theme in tokens.css and
      // a dark header, hero, find-my-part, trust strip, interstitial and
      // closing beat on screen (P14.S2). `allowPaths` is deliberately empty --
      // the hero stage was the one case that needed the ramp, and it has
      // --stage-* tokens now. See eslint-rules/no-graphite-utility.mjs.
      "local/no-graphite-utility": ["error", { allowPaths: [] }],
    },
  },
  {
    ...react.configs.flat.recommended,
    files: webFiles,
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      // React 17+ JSX runtime -- no need to import React to use JSX.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: webFiles,
  },
  {
    // MUI's palette can't accept var(--...) strings -- createTheme() runs
    // real color algebra (contrast ratios, lighten/darken, alpha()) that
    // needs a parseable hex/rgb/hsl value (see the file's own top comment).
    // This is the one narrow, documented exception to "zero hex outside
    // tokens.css"; every literal here is commented with the tokens.css
    // property it must stay byte-identical to.
    files: ["apps/web/lib/mui-theme.ts"],
    rules: {
      "local/no-raw-hex": "off",
    },
  },
  {
    // Repo tooling scripts (scripts/optimize-landing.mjs et al.) -- Node ESM,
    // run by hand from the repo root, never bundled into an app.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      // `URL` is a Node builtin, not a DOM leak -- listed so a script can parse
      // a connection string with the standard API instead of a hand-rolled
      // regex that a password containing ":" or "@" would defeat.
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
  {
    // The one script that drives a browser (P13.S0's hero scrub harness).
    //
    // `window` and `document` appear in it only inside `page.evaluate()`
    // callbacks, which Playwright serialises and runs in Chromium -- so they
    // are genuinely defined where they execute, and `no-undef` is reading them
    // in the wrong runtime. Scoped to this one file rather than added to the
    // `scripts/**` block above, because in any other script a bare `document`
    // really would be the mistake that rule is for.
    files: [
      "scripts/hero-shots.mjs",
      "scripts/og-image.mjs",
      "scripts/mobile-shots.mjs",
      "scripts/mobile-axe.mjs",
    ],
    languageOptions: {
      globals: { window: "readonly", document: "readonly" },
    },
  },
  {
    // ESM tool configs (next.config.mjs) -- Node ESM read by the framework at
    // build time, never bundled into a browser chunk, so `process` here is a
    // real Node global rather than the app-code smell `no-undef` guards
    // against. Separate from the `scripts/**` block above because these are
    // framework configs rather than scripts anyone runs.
    files: ["**/*.config.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
  {
    // CommonJS tool configs (tailwind.config.js et al.) -- not app code,
    // not ESM, run directly by Node under require().
    files: ["**/tailwind.config.js", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly", __dirname: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // eslint-plugin-tailwindcss (installed, per masterPlan.md §4/P0.S4) is not wired
  // in yet -- v4's recommended config eagerly loads a live Tailwind theme and
  // hard-crashes without one, and Tailwind itself isn't installed until P1.S2.
  // Activate it there, once apps/web/tailwind.config.js exists.
);
