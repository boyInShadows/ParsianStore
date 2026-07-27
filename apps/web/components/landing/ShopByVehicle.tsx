import { getTranslations } from "next-intl/server";
import { fetchVehicleTreeSafe } from "@/lib/fetchers/vehicles";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 08: "Saipa and Iran Khodro only ... no other
// makes, no imports." The real seeded vehicle tree already only has
// these two makes (§1.4/ADR 0004's scope narrowing), so fetching real
// data here naturally enforces the constraint rather than needing a
// hardcoded allowlist. Links to /vehicle/[make]/[model] (§3.1) --
// those pages don't exist until Phase 5+, same forward-reference as
// every other /p/, /c/, /brand/ link already on this route.
export async function ShopByVehicle() {
  const t = await getTranslations("Landing.sections.shopByVehicle");
  const makesWithModels = await fetchVehicleTreeSafe();

  if (makesWithModels.every(({ models }) => models.length === 0)) return null;

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
        {makesWithModels.map(({ make, models }) => (
          <div key={make.id} className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-display text-h3 font-black text-text">{make.name.fa}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {models.map((model) => (
                <li key={model.id}>
                  <a
                    href={`/vehicle/${make.slug}/${model.slug}`}
                    className="text-body-sm text-text-muted hover:text-brand"
                  >
                    {model.name.fa}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
