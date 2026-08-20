import { getTranslations } from "next-intl/server";
import { fetchVehicleTreeWithGenerationsSafe } from "@/lib/fetchers/vehicles";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 08: "Saipa and Iran Khodro only ... no other makes, no
// imports." The real seeded vehicle tree already has only these two makes
// (§1.4/ADR 0004), so fetching real data enforces the constraint without a
// hardcoded allowlist.
//
// P9.S10 closes 2026-08-14 audit item 1. Every model link used to target
// `/vehicle/[make]/[model]`, which is not a route -- the shipped page is
// `/vehicle/[make]/[model]/[gen]`, keyed by the generation's `yearFrom`. Every
// sampled link 404'd. Links now resolve a real generation, the newest one, and
// say so: the year rides along in mono so the destination is visible before
// the click rather than being a guess the component makes on the visitor's
// behalf.
//
// A model with no seeded generation has no honest link to offer, so it renders
// as plain text. Showing it greyed is better than a link that 404s, and better
// than hiding the model entirely -- the shop does stock it, the tree just has
// not been filled in yet.
export async function ShopByVehicle() {
  const t = await getTranslations("Landing.beats.shopByVehicle");
  const tree = await fetchVehicleTreeWithGenerationsSafe();

  if (tree.every(({ models }) => models.length === 0)) return null;

  return (
    <section
      id="shop-by-vehicle"
      aria-labelledby="shop-by-vehicle-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="shop-by-vehicle-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tree.map(({ make, models }) => (
          <div key={make.id} className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-display text-h3 font-black text-text">{make.name.fa}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {models.map(({ model, generations }) => {
                const newest = generations[0];
                return (
                  <li key={model.id}>
                    {newest ? (
                      <a
                        href={`/vehicle/${make.slug}/${model.slug}/${newest.yearFrom}`}
                        className="flex min-h-12 items-center justify-between gap-2 text-body-sm text-text-muted transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                      >
                        <span>{model.name.fa}</span>
                        <span className="font-mono text-caption text-text-muted">
                          {newest.yearFrom}
                        </span>
                      </a>
                    ) : (
                      <span className="flex min-h-12 items-center text-body-sm text-text-muted opacity-60">
                        {model.name.fa}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
