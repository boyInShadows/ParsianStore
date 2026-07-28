const HEX_PATTERN = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/;

function containsHex(text) {
  return typeof text === "string" && HEX_PATTERN.test(text);
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw hex color literals outside apps/web/styles/tokens.css (masterPlan.md §6.7).",
    },
    schema: [],
    messages: {
      banned:
        "Raw hex color literals are banned outside styles/tokens.css -- use a CSS variable / design token instead. See masterPlan.md §6.7.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (containsHex(node.value)) context.report({ node, messageId: "banned" });
      },
      TemplateElement(node) {
        if (containsHex(node.value.raw)) context.report({ node, messageId: "banned" });
      },
    };
  },
};
