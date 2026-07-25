const BANNED_EXACT = new Set(["text-left", "text-right"]);
const BANNED_PREFIXES = ["ml-", "mr-", "pl-", "pr-", "left-", "right-", "border-l", "border-r"];

function isBannedToken(token) {
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
