// §1.3 "The Exploded View" / §5 section 03 "Shop by system": the ~10
// automotive systems that drive both the landing page's Exploded View
// navigation (apps/web, Phase 4) and every Category's systemCode (P3.S1).
// Shared here (not duplicated per-app) since both consume the exact same
// code/slug/name triples. SYS-04 = brakes is fixed by masterPlan.md's own
// worked example (`SYS-04 · ترمز`, §1.3) — every other code/order follows
// standard auto-parts-catalog taxonomy.
export interface CatalogSystem {
  code: string;
  slug: string;
  name: { fa: string; en: string };
}

export const CATALOG_SYSTEMS = [
  { code: "SYS-01", slug: "engine", name: { fa: "موتور", en: "Engine" } },
  {
    code: "SYS-02",
    slug: "transmission",
    name: { fa: "گیربکس و انتقال قدرت", en: "Transmission & Drivetrain" },
  },
  {
    code: "SYS-03",
    slug: "suspension-steering",
    name: { fa: "تعلیق و فرمان", en: "Suspension & Steering" },
  },
  { code: "SYS-04", slug: "brakes", name: { fa: "ترمز", en: "Brakes" } },
  { code: "SYS-05", slug: "electrical", name: { fa: "برق خودرو", en: "Electrical" } },
  { code: "SYS-06", slug: "body-exterior", name: { fa: "بدنه و تزئینات", en: "Body & Exterior" } },
  {
    code: "SYS-07",
    slug: "cooling-ac",
    name: { fa: "خنک‌کننده و تهویه مطبوع", en: "Cooling & A/C" },
  },
  { code: "SYS-08", slug: "exhaust", name: { fa: "اگزوز", en: "Exhaust" } },
  { code: "SYS-09", slug: "interior", name: { fa: "داخل کابین", en: "Interior" } },
  { code: "SYS-10", slug: "filters-fluids", name: { fa: "فیلتر و روغن", en: "Filters & Fluids" } },
] as const satisfies readonly CatalogSystem[];

export type CatalogSystemCode = (typeof CATALOG_SYSTEMS)[number]["code"];

export const CATALOG_SYSTEM_CODES = CATALOG_SYSTEMS.map((system) => system.code) as [
  CatalogSystemCode,
  ...CatalogSystemCode[],
];
