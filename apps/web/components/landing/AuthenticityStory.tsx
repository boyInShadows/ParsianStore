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
      className="border-y border-border bg-surface-sunken py-20"
    >
      <Reveal className="mx-auto flex max-w-container flex-col gap-2 px-4">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="authenticity-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <a
        href={`/p/${product.slug}`}
        className="mx-auto mt-8 grid max-w-container grid-cols-1 border border-border bg-surface transition-colors hover:border-brand motion-reduce:transition-none lg:grid-cols-[0.85fr_1.15fr]"
      >
        <div className="min-h-64 relative flex flex-col justify-end overflow-hidden bg-graphite-950 p-6 text-graphite-0">
          {product.media[0] ? (
            <img
              src={product.media[0]}
              alt=""
              className="absolute inset-0 h-full w-full object-contain opacity-50"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 to-transparent" />
          <p className="relative z-10 font-display text-h2 font-black">{product.name.fa}</p>
          <p className="relative z-10 mt-2 font-mono text-data text-marigold-300">
            {product.authenticity.verificationCode}
          </p>
        </div>
        <dl className="gap-px p-px grid grid-cols-1 bg-rule sm:grid-cols-2">
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
    <div className="flex min-h-32 flex-col justify-between gap-4 bg-surface p-6">
      <dt className="font-mono text-caption text-text-muted">{label}</dt>
      <dd className={`text-body font-medium text-text ${mono ? "font-mono text-brand" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
