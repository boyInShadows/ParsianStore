import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { CONTACT_CHANNELS, type ContactChannelKind } from "@/lib/contact-info";
import { Reveal } from "@/components/motion";
import { VideoStage } from "./VideoStage";

/**
 * The page's last beat: how it works, who to ask, and one way back to the top
 * of the funnel (fableTasks §5 P9.S14, beat 10 of the §1 inventory).
 *
 * Three separate sections used to end this page -- a four-card How-it-works
 * grid, a Support section, and a Newsletter form -- and each one restated that
 * the visit was over without giving anyone anywhere to go. They fold into one
 * beat here: the process as a ruled rail rather than four bordered cards, the
 * support channels that actually exist, and a single CTA that returns to the
 * vehicle selector, which is where every path on this page starts.
 *
 * `chapter-4` stages it (fableTasks §3.3): the same rules as the authenticity
 * beat -- desktop and motion-allowed get the clip, everything else gets its
 * poster, and below 1024px no video bytes are fetched at all. It is atmosphere
 * behind the copy, never evidence, so the alt says "decorative" and every real
 * fact on the page lives in markup on top of it.
 *
 * Server component: real copy, real links, nothing interactive of its own. The
 * one client leaf is VideoStage, which needs the viewport to decide whether to
 * fetch video.
 */
export async function ClosingBeat() {
  const t = await getTranslations("Landing.beats.closing");
  const steps = t.raw("steps") as string[];

  // Looked up explicitly rather than as `t(`support.${kind}`)`: a template key
  // defeats next-intl's key checking, so a renamed message would fail at render
  // instead of at build.
  const channelLabel: Record<ContactChannelKind, string> = {
    phone: t("support.phone"),
    telegram: t("support.telegram"),
    whatsapp: t("support.whatsapp"),
  };

  return (
    <section
      id="closing"
      aria-labelledby="closing-heading"
      className="relative isolate border-t border-graphite-800 bg-graphite-950 text-graphite-50"
    >
      <VideoStage
        clip="chapter-4"
        alt={t("ambienceAlt")}
        className="absolute inset-0 -z-10 h-full w-full"
      >
        {/* Vertical scrim: the copy runs the full width here, so there is no
            empty third to protect the way the interstitial plate has. */}
        <div className="closing-scrim absolute inset-0" />
      </VideoStage>
      <div className="mx-auto grid max-w-container gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-8">
          <Reveal className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-cta" />
              <p className="font-mono text-data text-graphite-300">{t("code")}</p>
            </div>
            <h2 id="closing-heading" className="font-display text-h2 font-black text-graphite-0">
              {t("title")}
            </h2>
          </Reveal>

          {/* A real <ol>: this is a sequence, and the numbering is the content,
              not decoration. Ruled rows rather than four cards -- the same four
              facts, without pretending each is a separate object. */}
          <ol className="border-t border-graphite-800">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-baseline gap-4 border-b border-graphite-800 py-4"
              >
                <span className="font-mono text-data text-cta">
                  {toPersianDigits(String(index + 1).padStart(2, "0"))}
                </span>
                <span className="text-body text-graphite-100">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex flex-col gap-6 lg:border-s lg:border-graphite-800 lg:ps-16">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-h3 font-black text-graphite-0">
              {t("support.title")}
            </h3>
            <p className="text-body-sm text-graphite-300">{t("support.subtitle")}</p>
          </div>

          {/* Only channels with a real destination. WhatsApp is deliberately
              absent rather than dead-linked -- see lib/contact-info.ts. */}
          <ul className="flex flex-col gap-3 border-t border-graphite-800 pt-6">
            {CONTACT_CHANNELS.map((channel) => (
              <li key={channel.kind} className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-graphite-300">{channelLabel[channel.kind]}</span>
                <a
                  href={channel.href}
                  dir="ltr"
                  className="font-mono text-body-sm text-graphite-0 underline-offset-4 hover:text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {channel.display}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-caption text-graphite-400">{t("support.hoursPending")}</p>

          {/* Back to the vehicle selector rather than a generic "shop now":
              every route into the catalogue on this page begins by naming a
              car, so the honest last word is the same invitation as the first. */}
          <div className="flex flex-col gap-2 border-t border-graphite-800 pt-6">
            <a
              href="#driver-path"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-cta px-6 py-3 text-body font-bold text-cta-fg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              {t("cta")}
            </a>
            <p className="text-caption text-graphite-400">{t("ctaHint")}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
