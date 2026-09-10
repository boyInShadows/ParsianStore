import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
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
      className="border-y border-border bg-surface"
    >
      <h2 id="trust-strip-heading" className="sr-only">
        {t("title")}
      </h2>
      {/* No section plate here, deliberately (P13.S10).

          It was one of the three sections carrying a code in fa.json that
          never rendered it, and adding one made the page worse rather than
          better: this strip has no visible heading for a plate to belong to,
          and its four claims already carry their own ordinals in mono
          directly underneath. On screen that read as "03" followed by
          "01 02 03 04" -- which looks exactly like the broken numbering the
          audit reported, arrived at from the other direction.

          So the plate belongs to sections with a visible heading, and this
          one is excluded from the sequence the way `deals` is. Its `code`
          key is gone from fa.json rather than left unrendered, because an
          unrendered number is what consumed a slot in the first place. */}
      {/* The <ul> is the reveal wrapper rather than a div around it: the
          four claims arrive one after another, 60ms apart, and a list that
          reveals as one block reads as a slab dropping in. */}
      <Reveal
        as="ul"
        stagger
        className="mx-auto flex max-w-container flex-col divide-y divide-border px-4 sm:flex-row sm:divide-x sm:divide-y-0"
      >
        {items.map((item, index) => (
          <li key={item.title} className="flex flex-1 flex-col gap-2 px-4 py-6">
            <p className="flex items-center gap-3">
              {/* `cta-ink`, not `cta` (P14.S2). This strip used to sit on
                    graphite-900, where marigold-500 is 8.21:1; it follows the
                    theme now, and the same colour is 2.12:1 on a light
                    surface. --cta is a fill, --cta-ink is the same accent as
                    ink. See tokens.css. */}
              <span className="font-mono text-caption text-cta-ink">
                {/* Persian digits, like the closing beat's four steps
                      (P13.S10). These are ordinals a reader reads, not
                      identifiers -- the digit policy puts them in Persian
                      numerals, and the page was rendering two sets of the same
                      kind of number in two different systems. The section
                      plates stay Latin because those ARE identifiers. */}
                {toPersianDigits(String(index + 1).padStart(2, "0"))}
              </span>
              <span className="text-body-sm font-bold text-text">{item.title}</span>
            </p>
            <p className="text-caption leading-relaxed text-text-muted">{item.detail}</p>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
