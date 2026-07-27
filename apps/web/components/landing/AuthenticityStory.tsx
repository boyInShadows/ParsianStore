import { getTranslations } from "next-intl/server";
import { fetchExampleProduct } from "@/lib/fetchers/products";
import { Reveal } from "@/components/motion";

const SUPPLY_ROUTE_KEYS = {
  oem: "oem",
  "genuine-imported": "genuineImported",
  domestic: "domestic",
  "grade1-aftermarket": "grade1Aftermarket",
} as const;

// masterPlan.md §5 item 06: "Explains the Authenticity Record with a
// real example product. Not a slogan block." Real seeded product +
// its real authenticity fields (§3.5) -- verificationCode is genuinely
// the same value GET /authenticity/verify/:code (P3.S2) resolves.
export async function AuthenticityStory() {
  const t = await getTranslations("Landing.sections.authenticityStory");
  const product = await fetchExampleProduct();

  if (!product) return null;

  const supplyRouteLabel = t(`supplyRoutes.${SUPPLY_ROUTE_KEYS[product.authenticity.supplyRoute]}`);

  return (
    <section
      id="authenticity"
      aria-labelledby="authenticity-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="authenticity-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <a
        href={`/p/${product.slug}`}
        className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand motion-reduce:transition-none sm:grid-cols-2"
      >
        <div>
          <p className="text-body-sm text-text-muted">{product.name.fa}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <AuthenticityField
            label={t("verificationCode")}
            value={product.authenticity.verificationCode}
            mono
          />
          <AuthenticityField label={t("supplyRoute")} value={supplyRouteLabel} />
          <AuthenticityField label={t("sourceBrand")} value={product.authenticity.sourceBrand} />
          <AuthenticityField
            label={t("countryOfManufacture")}
            value={product.authenticity.countryOfManufacture}
          />
        </dl>
      </a>
    </section>
  );
}

function AuthenticityField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="gap-0.5 flex flex-col">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className={`text-body-sm text-text ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
