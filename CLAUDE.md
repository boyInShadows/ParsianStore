# CLAUDE.md — ParsianStore

Always-on rules for any agent session working in this repository. Full
context, architecture, and phase-by-phase spec: **`masterPlan.md`** — read it
first. This file is the distilled, load-bearing subset for day-to-day edits.

## Non-negotiables

1. **Work phase by phase, step by step** (`masterPlan.md` §13). Do not start
   step N+1 before step N's Definition of Done passes. If a requirement is
   ambiguous or missing scope, **stop and ask** — do not guess and build.
2. **Commit and push to `development` after every completed step.** No
   exceptions, per §12. Commit format:
   `<type>(<scope>): [P<phase>.S<step>] <subject>`.
3. **Never install a dependency outside the manifest in §4** without asking.
4. **No placeholder/lorem content.** Every user-facing string is real Persian
   copy or comes from `apps/web/messages/{fa,en}.json`.
5. **No hardcoded colors, spacing, radii, or font sizes** anywhere outside
   `apps/web/styles/tokens.css`. Tailwind config and MUI theme both read the
   same CSS variables — zero hex literals elsewhere.
6. **No physical CSS direction properties.** Never `left`, `right`, `ml-`,
   `mr-`, `pl-`, `pr-`, `text-left`, `text-right`, `border-l`, `border-r`.
   Logical only: `ms-` `me-` `ps-` `pe-` `start-` `end-` `text-start`
   `text-end` `border-s` `border-e`. ESLint enforces this — do not weaken or
   suppress the rule.
7. **Read a file before editing it.** Grep for an existing util before
   adding a new one — especially the Persian-text helpers in
   `packages/schemas/src/fa.js` (§7.5): `normalizeFa`, `toPersianDigits`,
   `toEnglishDigits`, `formatToman`, `formatJalali`, `normalizePhone`.
8. **Money is an integer in Rial**, field names suffixed `Rial`. Display only
   through `formatToman(rial)`. Never float math on currency, never in the UI.
9. **Dates are stored UTC ISO.** Display only through `formatJalali(date,
   pattern)`. Never store a Jalali string.
10. **Server Components by default.** Every `'use client'` needs a one-line
    comment justifying it (§10).
11. **Every API input is Zod-validated**; every list endpoint is paginated
    (`?page&limit&sort`, `limit` capped at 100); every route matches the
    `{ ok, data, meta?, error? }` envelope (§9).
12. **Module boundaries (§8):** a controller never touches Mongoose directly
    — it calls a service. A service never touches `req`/`res`. Providers
    (`PaymentProvider`, `SmsProvider`, `StorageProvider`, `SearchProvider`)
    are accessed only through their interface, mock implementation first.
13. **`legacy/` is reference-only.** It is the pre-monorepo prototype, not
    part of the pnpm workspace. Never import from it into `apps/*` or
    `packages/*`; port UI ideas by rewriting them against the current design
    system and component primitives instead.

## Definition of Done, every step (§14)

RTL correct · light + dark verified · responsive 360px→1920px · keyboard
reachable + visible focus + axe 0 violations · `prefers-reduced-motion`
honored · all strings in locale files with identical `fa`/`en` key sets ·
`pnpm lint && pnpm test && pnpm build` all pass · performance budget
respected for touched routes (§10) · committed with the correct tag and
pushed to `development` · the step's `STEP COMPLETE:` block emitted (§0).

## Output contract (§0)

On finishing a step, output exactly the `STEP COMPLETE:` block (files
touched, DoD checks with pass/fail, commit sha, next step). If blocked,
output exactly the `BLOCKED:` block (reason, 2-3 options with tradeoffs, a
recommendation) and stop.
