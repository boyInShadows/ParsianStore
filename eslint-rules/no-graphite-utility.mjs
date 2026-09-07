/**
 * Ban `bg-graphite-950` / `text-graphite-0` and friends in app code (P14.S2).
 *
 * ## Why a rule and not a code review
 *
 * The site had a light theme in `tokens.css` and no light theme on screen. The
 * cause was not a missing token -- it was that six sections and the header
 * reached past the semantic tokens straight into the graphite ramp, which does
 * not flip with `[data-theme]`. `bg-graphite-950` on a section that should
 * follow the theme and `bg-graphite-950` on a plate that must NOT follow it are
 * the same eight characters, so no diff and no audit could tell them apart, and
 * "light mode" quietly meant "the body and the footer".
 *
 * Both cases now have a token: `bg-surface` / `text-text` / `border-border`
 * flip, and `bg-stage` / `text-stage-text` / `border-stage-border` deliberately
 * do not. With both sayable, reaching for the ramp is always the mistake.
 *
 * ## Why there is no hero-stage exemption
 *
 * The step that added this rule specified one -- the hero stage keeps a dark
 * ground in both themes, and at the time that was only expressible as a
 * graphite literal. The `--stage-*` tokens made the exemption unnecessary
 * rather than merely unused: every element on the stage now names the stage.
 * `allowPaths` exists so a future genuine exception is a configured decision in
 * `eslint.config.mjs` rather than a rule someone weakens; it defaults to none.
 *
 * ## What it does NOT match, and why that is deliberate
 *
 * Only a *utility* is a violation: a colour-taking Tailwind prefix followed by
 * `graphite-<step>`. A bare `graphite-${step}` is how `lib/cn.ts` builds
 * tailwind-merge's colour list, and `"color-graphite-"` is how
 * `lib/design-tokens.ts` reads the ramp out of `tokens.css` for the styleguide.
 * Both are the ramp as *data*, which is exactly what those files are for.
 * A `startsWith("graphite-")` test would have flagged them and taught the next
 * person to add an eslint-disable, which is the failure mode this rule exists
 * to avoid -- the same lesson `no-physical-direction` records about
 * `border-rule`.
 */

// Every Tailwind utility prefix that takes a colour. `shadow-` is here because
// Tailwind 3 accepts a colour there too (`shadow-graphite-900`).
const COLOR_PREFIXES = [
  "bg",
  "text",
  "border",
  "border-x",
  "border-y",
  "border-s",
  "border-e",
  "border-t",
  "border-b",
  "divide",
  "divide-x",
  "divide-y",
  "ring",
  "ring-offset",
  "outline",
  "from",
  "via",
  "to",
  "fill",
  "stroke",
  "accent",
  "caret",
  "decoration",
  "placeholder",
  "shadow",
];

// e.g. `bg-graphite-950`, `hover:border-t-graphite-800/40`, `md:!text-graphite-0`.
const UTILITY = new RegExp(`^(?:${COLOR_PREFIXES.join("|")})-graphite-\\d+(?:\\/\\d+)?$`);

/** A variant-prefixed class is the same utility (`lg:hover:bg-graphite-900`). */
function stripVariants(token) {
  const lastColon = token.lastIndexOf(":");
  return lastColon === -1 ? token : token.slice(lastColon + 1);
}

function findBannedToken(text) {
  if (typeof text !== "string") return undefined;
  return text
    .split(/\s+/)
    .map((raw) => stripVariants(raw).replace(/^!/, ""))
    .find((token) => UTILITY.test(token));
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow graphite-ramp colour utilities in app code; use the semantic tokens (surface/text/border) or the stage tokens (stage/stage-text/stage-border) instead (masterPlan.md §6.4, P14.S2).",
    },
    schema: [
      {
        type: "object",
        properties: {
          /** Path fragments (POSIX separators) exempted from the rule. */
          allowPaths: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      banned:
        'Graphite-ramp utility "{{token}}" does not flip with [data-theme], so it is what a section looks like when it has no light mode. Use bg-surface/bg-bg + text-text + border-border on anything that follows the theme, or bg-stage + text-stage-text + border-stage-border on a plate that is deliberately dark in both themes. See styles/tokens.css.',
    },
  },
  create(context) {
    const allowPaths = context.options[0]?.allowPaths ?? [];
    const filename = context.filename.split("\\").join("/");
    if (allowPaths.some((fragment) => filename.includes(fragment))) return {};

    return {
      Literal(node) {
        const token = findBannedToken(node.value);
        if (token) context.report({ node, messageId: "banned", data: { token } });
      },
      TemplateElement(node) {
        const token = findBannedToken(node.value.raw);
        if (token) context.report({ node, messageId: "banned", data: { token } });
      },
    };
  },
};
