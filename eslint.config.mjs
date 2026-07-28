import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import noPhysicalDirection from "./eslint-rules/no-physical-direction.mjs";
import noRawHex from "./eslint-rules/no-raw-hex.mjs";

const local = {
  rules: {
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
