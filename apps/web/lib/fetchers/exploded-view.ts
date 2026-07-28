import { CATALOG_SYSTEMS, facetsResponseSchema, type CatalogSystemCode } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// `null` means "count unknown" (API unreachable at build/request time --
// e.g. CI's `pnpm build` has no live API process, only MongoDB). Callers
// must omit the count rather than render `null` as "۰", which would look
// like real (and wrong) zero-stock data -- masterPlan.md's no-fabricated-
// data rule applies to failure states too, not just missing content.
export type SystemPartCounts = Record<CatalogSystemCode, number | null>;

// Real per-system product counts for the Exploded View (masterPlan.md
// §1.3: hover/tap "reveals the Persian name + part count"). seed/
// catalog.ts creates exactly one root Category per CATALOG_SYSTEMS entry
// with a matching slug, so /catalog/facets' category buckets join back to
// a system by slug directly -- no separate /categories fetch needed.
// No explicit cache/revalidate option: this keeps the landing route fully
// static (baked at build), which is the safe default until §11's real
// caching/ISR strategy is decided (masterPlan.md line 967, Phase 8+) --
// not a decision to make silently inside a P4.S2 component.
export async function getSystemPartCounts(): Promise<SystemPartCounts> {
  const unknown = Object.fromEntries(
    CATALOG_SYSTEMS.map((system) => [system.code, null]),
  ) as SystemPartCounts;

  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/facets`);
    if (!res.ok) return unknown;

    const json = await res.json();
    const parsed = facetsResponseSchema.safeParse(json);
    if (!parsed.success) return unknown;

    const countBySlug = new Map(parsed.data.data.categories.map((b) => [b.slug, b.count]));
    return Object.fromEntries(
      CATALOG_SYSTEMS.map((system) => [system.code, countBySlug.get(system.slug) ?? 0]),
    ) as SystemPartCounts;
  } catch {
    // Network-level failure (e.g. API not running) -- fetch() throws
    // before a Response even exists, unlike a non-2xx status above.
    return unknown;
  }
}
