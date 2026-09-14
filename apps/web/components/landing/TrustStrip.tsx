import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { Reveal } from "@/components/motion";

type TrustItem = { title: string; detail: string };

/**
 * The hairline each cell draws, by position (P15.S5).
 *
 * ## Why per-cell borders and not `divide`
 *
 * `divide-y` / `divide-x` is a ONE-dimensional device: it rules the gaps
 * between N children laid out along a single axis. The layout below is a 2x2
 * band through the whole tablet range, which needs a rule between the two
 * columns AND between the two rows, and `divide` cannot express both at once.
 *
 * It was also drawing the horizontal case in the wrong place. `divide-x` is
 * physical -- it sets `border-left-width` on every child but the first -- and
 * under `dir="rtl"` the first child is the RIGHTMOST one. Measured on the
 * shipped build at 1440px, the three rules landed at x721, x368 and x16: one
 * between claims 2|3, one between 3|4, and one hanging off the band's end edge
 * with nothing beyond it, while claims 1 and 2 had no rule between them at all.
 * The file's own comment claimed `divide` "handles both writing directions";
 * it does not, and that is the class of bug the repo's logical-property rule
 * exists to prevent. `border-s` is the logical equivalent and lands on the
 * near edge in both directions.
 *
 * ## Why an explicit table and not a uniform border plus edge cancelling
 *
 * The usual grid trick -- give every cell a block-start and an inline-start
 * rule, then clip the first row and first column away with a negative offset
 * or `:nth-child` overrides -- needs a 1px length in app code, and the spacing
 * scale here is REPLACED rather than extended (`tailwind.config.js`), so there
 * is no `gap-px` / `-mt-px` to reach for and inventing one would be a
 * hardcoded length outside tokens.css. There are exactly four claims and
 * exactly three layouts, so the honest form is to say which rule each cell
 * owns in each of them:
 *
 *            1 col (<640)      2 cols (640-1279)    4 cols (1280+)
 *   claim 1  --                --                   --
 *   claim 2  block-start       inline-start         inline-start
 *   claim 3  block-start       block-start          inline-start
 *   claim 4  block-start       block-start + start  inline-start
 *
 * Every interior gap gets exactly one rule and no cell at a band edge draws
 * one, so the section's own `border-y` is never doubled and nothing hangs off
 * the end. Grid rows stretch, so a column rule spans its whole row and the
 * two ends meet.
 */
const CELL_RULES = [
  "",
  "border-t sm:border-t-0 sm:border-s",
  "border-t xl:border-t-0 xl:border-s",
  "border-t sm:border-s xl:border-t-0",
];

/**
 * masterPlan.md §5-02: "Hairline-separated, mono labels, no icons-in-circles
 * clichés." No icon glyphs at all -- the numbering is the only ornament.
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
      {/* Two-up through the whole tablet band, not four (P15.S5).

          Four-across from 640px gave each claim a 184px column, and three of
          the four titles wrapped at 768px -- LESS room than a 390px phone
          gives them, because the phone stacks and hands each claim 358px. The
          "~35 characters, one line" width rule in docs/voice.md is written
          against the phone, so it could never have caught a component whose
          worst case is the tablet. Two-up is 336px at 768 and 464px at 1024,
          against a 202px longest title; four-up returns at 1280 where the
          column is 311px. The copy is not the thing to cut -- voice.md rule 3
          puts the verb first, and these claims lose their verbs at 20
          characters.

          A grid rather than a wrapped flex row, because the rules above need
          cells that line up in both axes: wrapped flex items size themselves
          and a 2x2 of them is two independent rows that need not share a
          column edge for a vertical hairline to run down. */}
      {/* The <ul> is the reveal wrapper rather than a div around it: the
          four claims arrive one after another, 60ms apart, and a list that
          reveals as one block reads as a slab dropping in. */}
      <Reveal
        as="ul"
        stagger
        className="mx-auto grid max-w-container grid-cols-1 px-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {items.map((item, index) => (
          <li
            key={item.title}
            // The table covers the four claims §5-02 specifies. A fifth would
            // open a new row in every one of the three layouts, and a
            // block-start rule is the correct hairline for a first-in-row cell
            // in all of them -- so an extra claim degrades to a right-but-plain
            // rule rather than to no rule at all.
            className={`flex flex-col gap-2 border-border px-4 py-6 ${CELL_RULES[index] ?? "border-t"}`}
          >
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
