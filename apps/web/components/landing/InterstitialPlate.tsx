import { getTranslations } from "next-intl/server";
import { LandingImage } from "./LandingImage";

/**
 * One full-bleed atmosphere plate, breathing between the symptom finder and the
 * brand wall. No card chrome, no border, no heading rail -- the whole point of
 * this beat is that it is not another section-shaped section.
 *
 * The copy sits on the start-side third. That third is empty because the plate
 * ships pre-mirrored: the renders were framed for LTR with the subject in the
 * end-side two thirds, and the P9.S3 pipeline flips them so Persian's reading
 * order gets the space (fableTasks §3.3). Nothing in frame betrays the flip.
 *
 * Server component: a static image with text over it needs no client.
 */
export async function InterstitialPlate() {
  const t = await getTranslations("Landing.beats.interstitial");

  return (
    <section
      id="interstitial"
      aria-labelledby="interstitial-heading"
      className="relative isolate overflow-hidden bg-graphite-950"
    >
      <LandingImage
        src="/landing/plates/plate-body"
        alt={t("imageAlt")}
        sizes="100vw"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      {/* Reads from the start side, so the scrim is heaviest there -- the plate
          keeps its own two thirds legible as artwork. */}
      <div className="interstitial-scrim absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-container flex-col justify-center gap-3 px-4 py-20 lg:px-8 lg:py-32">
        {/* One of the three sections that carried a code and never rendered it
            (P13.S10/S12). */}
        <p className="flex items-center gap-3">
          <span className="h-px w-12 bg-cta" />
          <span className="font-mono text-data text-graphite-300">{t("code")}</span>
        </p>
        <h2
          id="interstitial-heading"
          className="max-w-md font-display text-h2 font-black text-graphite-0"
        >
          {t("title")}
        </h2>
        <p className="max-w-md text-body text-graphite-200">{t("body")}</p>
      </div>
    </section>
  );
}
