import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion";

type TrustItem = { title: string; detail: string };

/**
 * masterPlan.md §5-02: "Hairline-separated, mono labels, no icons-in-circles
 * clichés." No icon glyphs at all -- the numbering is the only ornament, and
 * `divide` handles both writing directions under dir="rtl".
 *
 * P9.S7 turns each claim into claim + process. "ارسال سریع" as a bare label is
 * a promise; "پیش از خرید، سازگاری قطعه با خودروی شما بررسی می‌شود" is a thing
 * the site actually does and the visitor can go check. The four now name the
 * fitment check, the authenticity record, server-side payment verification and
 * the free consult -- each one a real mechanism, per fableTasks §5-S7.
 *
 * This is also the quiet beat: it follows the hero's one orchestrated sequence,
 * so it stays a low, evenly-ruled rail rather than competing with it.
 */
export async function TrustStrip() {
  const t = await getTranslations("Landing.beats.trustStrip");
  const items = t.raw("items") as TrustItem[];

  return (
    <section
      id="trust-strip"
      aria-labelledby="trust-strip-heading"
      className="border-y border-graphite-800 bg-graphite-900"
    >
      <h2 id="trust-strip-heading" className="sr-only">
        {t("title")}
      </h2>
      <Reveal>
        <ul className="mx-auto flex max-w-container flex-col divide-y divide-graphite-800 px-4 sm:flex-row sm:divide-x sm:divide-y-0">
          {items.map((item, index) => (
            <li key={item.title} className="flex flex-1 flex-col gap-2 px-4 py-6">
              <p className="flex items-center gap-3">
                <span className="font-mono text-caption text-cta">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-body-sm font-bold text-graphite-0">{item.title}</span>
              </p>
              <p className="text-caption leading-relaxed text-graphite-300">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
