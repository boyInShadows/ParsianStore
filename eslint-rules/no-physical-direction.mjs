// `border-l`/`border-r` are real utilities on their own (a 1px border) AND
// prefixes of sized/colored ones (`border-r-2`), but they are NOT prefixes
// of every class that happens to start with those letters -- matching them
// with startsWith() flagged `border-rule`, the divider token added in §6.8,
// as a physical direction. Exact-or-followed-by-a-dash is the honest test.
const BANNED_EXACT = new Set(["text-left", "text-right", "border-l", "border-r"]);
const BANNED_PREFIXES = ["ml-", "mr-", "pl-", "pr-", "left-", "right-", "border-l-", "border-r-"];

// A variant-prefixed class is the same utility: `hover:border-r-2` and
// `md:ml-4` were both invisible to this rule before, since the raw token
// starts with the variant, not the utility.
function stripVariants(token) {
  const lastColon = token.lastIndexOf(":");
  return lastColon === -1 ? token : token.slice(lastColon + 1);
}

function isBannedToken(rawToken) {
  // Leading "!" is Tailwind's important modifier, and it sits after the
  // variants (`hover:!ml-2`).
  const token = stripVariants(rawToken).replace(/^!/, "");
  if (BANNED_EXACT.has(token)) return true;
  return BANNED_PREFIXES.some((prefix) => token.startsWith(prefix));
}

function findBannedToken(text) {
  if (typeof text !== "string") return undefined;
  return text.split(/\s+/).find((token) => token && isBannedToken(token));
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow physical-direction Tailwind utility classes; logical utilities only (masterPlan.md §7.2, RTL requirement).",
    },
    schema: [],
    messages: {
      banned:
        'Physical direction utility "{{token}}" is banned -- use the logical equivalent (ms-/me-/ps-/pe-/start-/end-/text-start/text-end/border-s/border-e). See masterPlan.md §7.2.',
    },
  },
  create(context) {
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
