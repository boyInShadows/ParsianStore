import { getTranslations } from "next-intl/server";
import { fetchExampleProduct } from "@/lib/fetchers/products";
import { Reveal } from "@/components/motion";
import { VideoStage } from "./VideoStage";
import { EvidenceCode } from "@/components/authenticity";

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
  const t = await getTranslations("Landing.beats.authenticityStory");
  const product = await fetchExampleProduct();

  if (!product) return null;

  const supplyRouteLabel = t(`supplyRoutes.${SUPPLY_ROUTE_KEYS[product.authenticity.supplyRoute]}`);

  return (
    <section
      id="authenticity"
      aria-labelledby="authenticity-heading"
      className="border-y border-border bg-surface-sunken"
    >
      {/* The engine-bay clip stages this beat (fableTasks 3.3). It is the
          backdrop the story is told against -- the evidence itself is the real
          catalog record below, never the render. */}
      {/* Framed, like the interstitial and the closing beat (P14.S2). The
          section around it was already light -- the audit's claim that
          `#authenticity` renders dark is wrong, it computes to rgb(238,241,244)
          -- so the only thing missing was that the clip ran full-bleed inside a
          contained section, which read as a band that had escaped the layout
          rather than as a plate. */}
      <div className="mx-auto max-w-container px-4 pt-12 lg:px-8 lg:pt-16">
        <VideoStage
          clip="chapter-2"
          alt={t("stageAlt")}
          className="aspect-[16/9] w-full rounded-lg border border-border lg:aspect-[21/9]"
        >
          <div className="authenticity-scrim absolute inset-0" />
          <Reveal className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 lg:p-8">
            <p className="font-mono text-data text-stage-text-faint">{t("code")}</p>
            <h2
              id="authenticity-heading"
              className="font-display text-h2 font-bold text-stage-text"
            >
              {t("title")}
            </h2>
            <p className="max-w-2xl text-body text-stage-text-muted">{t("subtitle")}</p>
          </Reveal>
        </VideoStage>
      </div>
      {/* Same gutter as the plate above it. The card used to run edge to edge
          while the clip did too, so they agreed; now that the clip is framed,
          an unpadded card underneath reads as a second, wider column. */}
      <Reveal className="mx-auto max-w-container px-4 pb-20 pt-8 lg:px-8">
        <a
          href={`/p/${product.slug}`}
          className="grid grid-cols-1 border border-border bg-surface transition-colors hover:border-brand motion-reduce:transition-none lg:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="relative flex aspect-[4/3] flex-col justify-end overflow-hidden bg-stage p-6 text-stage-text lg:aspect-auto">
            {product.media[0] ? (
              <img
                src={product.media[0]}
                alt=""
                className="absolute inset-0 h-full w-full object-contain opacity-50"
              />
            ) : null}
            <div className="authenticity-tile-scrim absolute inset-0" />
            <p className="relative z-10 font-display text-h2 font-bold">{product.name.fa}</p>
            <p className="relative z-10 mt-2 flex text-data text-cta">
              <EvidenceCode code={product.authenticity.verificationCode} />
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
      </Reveal>
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
      <dd className="flex text-body font-medium text-text">
        {mono ? <EvidenceCode code={value} className="text-brand" /> : value}
      </dd>
    </div>
  );
}
