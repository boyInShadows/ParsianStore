# ADR 0002 — Morabba is not OFL; use Estedad Black for Display

**Date:** 2026-07-25
**Status:** Accepted

## Context

`masterPlan.md` §6.5 lists **Morabba** as the Display typeface and asserts
it is licensed under SIL OFL 1.1, free to self-host. While sourcing fonts
for P1.S3, that assumption checked out false: the Morabba font (design
credited to Hassan Manzoori / Shahrzad Akbari) is a commercial product
owned by **fontiran.com** (Moslem Ebrahimi) — "license required from
fontiran.com," "all rights reserved" per the foundry's own listing and
third-party font-catalog sites. It is not OFL, not free, and not
redistributable. Self-hosting or committing it to this repository without
a paid commercial license would be a licensing violation.

No GitHub repository, release, or OFL.txt for an OFL-licensed "Morabba"
exists — searched both GitHub's repo/code search and the general web.

## Decision

Use **Estedad Black** (and other Estedad weights as needed for the type
scale) as the Display typeface instead of Morabba, exactly as `masterPlan.md`
§6.5 already names as the fallback: *"Fallback for Display if Morabba's
weight coverage disappoints in testing: Estedad Black (also OFL)."* This
decision activates that same named fallback — the trigger is a licensing
problem rather than a weight-coverage problem, but the resolution is the one
the plan already anticipated, not a new invention.

Estedad's OFL-1.1 license is verified via its GitHub source
(`github.com/aminabedi68/Estedad`, `license: OFL-1.1`) and its presence on
Google Fonts, which requires OFL (or another qualifying open license) for
inclusion.

`masterPlan.md` §6.5 is amended: the Display row's face changes from
Morabba to Estedad, and the type-scale table's "Morabba 700" / "Morabba 600"
entries become the equivalent Estedad weights.

## Consequences

- `apps/web/public/fonts/estedad/` ships the self-hosted WOFF2 files +
  `OFL.txt`, not a `morabba/` directory.
- Every reference to "Morabba" elsewhere in this repo (code, comments,
  future docs) should be read as Estedad going forward.
- Vazirmatn (body/UI) and JetBrains Mono (data) are unaffected — both were
  independently verified as genuinely OFL before this ADR and require no
  substitution.
- If a real Morabba license is purchased later, swapping the Display face
  back is a font-file + `next/font/local` config change only — the type
  scale, weights, and usage rules in §6.5 stay structurally the same.
