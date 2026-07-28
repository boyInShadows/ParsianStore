/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "step-tag-present": (parsed) => {
          const subject = parsed.subject ?? "";
          // PLAN: masterPlan.md content amendments (§16). REPO: cross-cutting
          // repo/tooling hygiene not tied to a single phase step (e.g. .gitignore
          // policy) -- both are additions on top of masterPlan.md §12's own
          // "[P<phase>.S<step>]" tag requirement, not a replacement for it.
          const ok = /^\[(P\d+\.S\d+|PLAN|REPO)\]\s/.test(subject);
          return [
            ok,
            'Commit subject must start with a "[P<phase>.S<step>]", "[PLAN]", or "[REPO]" tag, e.g. "[P0.S4] wire eslint gate" (masterPlan.md §12).',
          ];
        },
      },
    },
  ],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "perf", "style", "docs", "test", "chore", "ci", "build"],
    ],
    "scope-enum": [2, "always", ["web", "api", "schemas", "ui", "config", "repo"]],
    "step-tag-present": [2, "always"],
  },
};
