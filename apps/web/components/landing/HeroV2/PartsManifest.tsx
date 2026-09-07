import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { landingAsset, landingFallback, landingSrcSet } from "@/lib/landing-image";
import { manifestEntries, type ManifestEntry } from "./manifestData";
import { ManifestCheckIn } from "./ManifestCheckIn";

/**
 * The job card: the numbered list a workshop manual prints beside its exploded
 * drawing (fableTasks2 §2, fableTasks v1.1 §1.4).
 *
 * **A Server Component, deliberately.** Nine rows of image, text and link are
 * exactly what does not need to reach the browser as JavaScript. The two things
 * that genuinely cannot be server-rendered -- the check-in choreography and the
 * row/sprite highlight -- are small client leaves that touch this markup
 * through data attributes rather than owning it.
 *
 * ## One node, two layouts (P13.S7)
 *
 * This used to render **twice**: a desktop side panel and a mobile chip rail,
 * with CSS hiding one. That was not a stylistic choice -- the panel had to be
 * sticky beside the drawing and the rail had to sit under the stage, and one
 * element cannot be in two grid cells, so the markup was duplicated instead.
 *
 * `docs/performance-landing.md` measured what that cost: the visible manifest
 * is the **entire** Phase 12 TBT regression, 130ms -> 261ms against a 200ms
 * budget, and that same document names "render it once" as the fix it could not
 * reach because of the layout conflict. P13.S7 dissolves the conflict by moving
 * the job card inside the pinned block at both breakpoints, so one instance can
 * be a column beside the stage at `lg` and a snap-scrolling strip under it
 * below `lg`.
 *
 * The row markup is therefore one shape that reads both ways: a vertical card
 * in a horizontal scroller by default, a horizontal row in a column at `lg`.
 * The `SYS-xx` code is the only thing that differs -- hidden below `lg`, because
 * it earns its place in a full-width row and would push the part's own name
 * onto a second line in an 8rem chip, and the name is what a visitor scans for.
 *
 * ## The accessible-name rule this obeys
 *
 * The action text ("مشاهده قطعات این سیستم") is an `sr-only` span *inside* the
 * link, never an `aria-label` on it. P9.S17 found the opposite pattern on the
 * system index: an `aria-label` replaces the whole accessible name, so a link
 * reading "SYS-01 موتور ۳۲ قطعه" on screen was named something else entirely --
 * a WCAG 2.5.3 (Label in Name, level A) failure, because a voice-control user
 * saying what they can see would not match. Appending keeps the visible text
 * inside the name.
 */

/**
 * Live since P12.S5. Kept as a named constant rather than deleted: it is the
 * one switch that takes the manifest off the page if it ever needs to go, and
 * it matches the `SECTION_HIDDEN` convention Newsletter and GuidesTeaser use.
 */
const MANIFEST_HIDDEN = false;

/**
 * Runs during parse, before the browser paints the list.
 *
 * The server has to send every row visible -- that is what a no-JS or
 * reduced-motion visitor reads (§2.3) -- so the choreography has to *remove*
 * them before it can check them back in. Left to the mount effect, that removal
 * happens after first paint: the manifest appears, then fades away, then walks
 * back in as you scroll. A flash on load is exactly what masterPlan §6.7
 * forbids, and it is also what made the page-level axe sweep fail, because axe
 * sampled the half-transparent text mid-fade and scored the blended colour.
 *
 * So it is set here instead, the same way next-themes avoids a theme flash in
 * `app/[locale]/layout.tsx`: a blocking inline script, before paint. It reads
 * the reduced-motion preference itself, so that visitor's list is never touched
 * at all. If the script never runs -- no JS, or a future nonce-based CSP -- the
 * list simply stands complete, which is the correct fallback either way.
 */
const PRE_PAINT = `(function(){var s=document.currentScript,l=s&&s.previousElementSibling;
if(!l||!l.dataset||l.dataset.chapterReached===undefined)return;
if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
l.dataset.choreographed="true";l.dataset.chapterReached="0";})()`;

/** The thumbnail rung the pipeline emits for exactly this (P12.S4). */
const THUMB_WIDTH = 96;
/** What it is drawn at. 96 covers it at 2x. */
const THUMB_CSS_PX = 48;

function ManifestRow({
  entry,
  name,
  count,
  action,
}: {
  entry: ManifestEntry;
  name: string;
  count: string | null;
  action: string;
}) {
  const asset = landingAsset(`/landing/${entry.assetGroup}/${entry.asset}`);

  return (
    <li
      data-chapter={entry.chapter}
      data-part={entry.id}
      // The scroll position this row ticks in at, read by ManifestCheckIn.
      data-check-in={entry.checkInAt.toFixed(4)}
      // `w-32` below lg, auto at lg. The spacing scale is REPLACED with
      // 0,1,2,3,4,6,8,12,16,20,24,32, so `w-36` generates nothing and
      // `flex-none` would then size each chip to its own text -- measured 74px
      // to 99px, a visibly ragged rail. Same silent off-scale-utility failure
      // P11.S3 hit with `w-11`.
      className="manifest-row w-32 flex-none snap-start lg:w-auto"
    >
      <a
        href={entry.href}
        className="relative flex h-full min-h-12 flex-col gap-1 border border-border p-3 text-text transition-colors duration-fast hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none lg:flex-row lg:items-center lg:gap-3 lg:border-x-0 lg:border-t-0 lg:p-0 lg:py-2"
      >
        {/* Decorative: the row's name says what the part is, so alt text here
            would make a screen reader announce it twice. */}
        <img
          src={landingFallback(asset)}
          srcSet={landingSrcSet(asset)}
          sizes={`${THUMB_CSS_PX}px`}
          width={THUMB_WIDTH}
          height={Math.round((asset.intrinsic.height / asset.intrinsic.width) * THUMB_WIDTH)}
          alt=""
          loading="lazy"
          decoding="async"
          // h-12 w-12, not h-10: `h-10` is off the replaced spacing scale and
          // generates no CSS at all, so the image falls back to `height:auto`
          // and the piston rendered 118px tall inside a 48px row.
          className="h-12 w-12 flex-none object-contain"
        />
        <span className="text-body-sm lg:flex-1">{name}</span>
        {/* The half that arrives when the part does. A ghosted row is a line on
            a blank job card -- the part's name, nothing filled in yet -- and
            checking in fills the rest. Grouped in one element so the fade is
            one transition rather than several that can drift apart. */}
        <span className="manifest-detail flex items-center gap-3">
          <span className="hidden font-mono text-caption text-text-muted lg:inline">
            {entry.system}
          </span>
          {/* Omitted, never rendered as zero, when the API could not answer --
              `getSystemPartCounts` returns null for "unknown", and a fabricated
              "۰ قطعه" would read as real out-of-stock data. */}
          {count !== null ? (
            <span className="font-mono text-caption text-text-muted">{count}</span>
          ) : null}
        </span>
        <span className="sr-only">{action}</span>
      </a>
    </li>
  );
}

export async function PartsManifest() {
  if (MANIFEST_HIDDEN) return null;

  const t = await getTranslations("Landing.manifest");
  const counts = await getSystemPartCounts();
  const entries = manifestEntries();

  return (
    <nav aria-label={t("navLabel")} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body font-bold text-text">{t("title")}</h2>
        {/* The counter, pre-rendered once per possible value with the client
            marking the one that is true (P13.S4). Ten spans rather than one the
            browser rewrites, because the count is Persian-shaped text:
            `toPersianDigits` and the ICU message both live on the server, and
            rebuilding "۳ از ۹" in the browser would ship the digit mapping and
            the message formatter to a route already over budget, to render ten
            strings that are known at build time. */}
        <p className="manifest-counter font-mono text-caption text-text-muted">
          {/* Ascending, so the LAST span is the complete count -- what CSS falls
              back to when JavaScript never marks one, and the state a no-JS
              visitor's fully-rendered list is actually in. */}
          {Array.from({ length: entries.length + 1 }, (_, count) => (
            <span key={count} data-count={count}>
              {t("counter", {
                n: toPersianDigits(count),
                total: toPersianDigits(entries.length),
              })}
            </span>
          ))}
        </p>
      </div>
      {/* Read instead of the choreography, which a screen reader never sees. */}
      <p className="sr-only">{t("intro")}</p>
      {/* `data-chapter-reached` starts at the LAST chapter, not the first: with
          no JavaScript, or with reduced motion, every row must already be
          present (§2.3). The client leaf below only ever takes rows *away* --
          and only once it knows it can bring them back. */}
      <ManifestCheckIn>
        <ol
          className="manifest-list flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-x-visible lg:pb-0"
          data-chapter-reached="3"
        >
          {entries.map((entry) => (
            <ManifestRow
              key={entry.id}
              entry={entry}
              name={t(`parts.${entry.nameKey}`)}
              count={
                counts[entry.system] === null
                  ? null
                  : // Persian digits, per the system rail beside it.
                    t("partsCount", { count: toPersianDigits(counts[entry.system] as number) })
              }
              action={t("rowAction")}
            />
          ))}
        </ol>
        {/* Must stay the list's immediately next sibling -- `PRE_PAINT` finds
            the list through `currentScript.previousElementSibling`. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
      </ManifestCheckIn>
    </nav>
  );
}
