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
    <section id="interstitial" aria-labelledby="interstitial-heading" className="bg-bg">
      {/* Framed rather than full-bleed (P14.S2). The plate is a dark render and
          stays one in both themes -- lightening it is not available, there is
          no light version of the artwork. What changes is that in light mode it
          stops being "a section that failed to switch" and becomes a picture on
          the page: the section around it takes --bg, and the plate takes a 1px
          --border edge, a radius and the container's own gutter. */}
      <div className="mx-auto max-w-container px-4 py-12 lg:px-8 lg:py-16">
        <div className="relative isolate overflow-hidden rounded-lg border border-border bg-stage">
          <LandingImage
            src="/landing/plates/plate-body"
            alt={t("imageAlt")}
            sizes="100vw"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          {/* Reads from the start side, so the scrim is heaviest there -- the
              plate keeps its own two thirds legible as artwork. */}
          <div className="interstitial-scrim absolute inset-0 -z-10" />
          <div className="flex flex-col justify-center gap-3 px-4 py-20 lg:px-8 lg:py-32">
            {/* One of the three sections that carried a code and never rendered
                it (P13.S10/S12). */}
            <p className="flex items-center gap-3">
              <span className="h-px w-12 bg-cta" />
              <span className="font-mono text-data text-stage-text-faint">{t("code")}</span>
            </p>
            <h2
              id="interstitial-heading"
              className="max-w-md font-display text-h2 font-bold text-stage-text"
            >
              {t("title")}
            </h2>
            <p className="max-w-md text-body text-stage-text-muted">{t("body")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
