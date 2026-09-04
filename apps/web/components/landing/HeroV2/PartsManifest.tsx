import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { landingAsset, landingFallback, landingSrcSet } from "@/lib/landing-image";
import { manifestEntries, type ManifestEntry } from "./manifestData";
import { ManifestCheckIn } from "./ManifestCheckIn";

/**
 * The parts manifest: the numbered list a workshop manual prints beside its
 * exploded drawing (fableTasks2 §2).
 *
 * **A server component, deliberately.** Nine rows of image, text and link are
 * exactly the kind of thing that does not need to reach the browser as
 * JavaScript, and the hero is already 18KB over its route budget. The two
 * things that genuinely cannot be server-rendered -- the check-in choreography
 * and the row/sprite highlight -- are two small client leaves that touch this
 * markup through data attributes rather than owning it.
 *
 * ## What a row is
 *
 * One `<a>` per part, wrapping everything: thumbnail, Persian name, the mono
 * `SYS-xx` code, and the real product count for that system. Not a div with a
 * nested link -- the whole row is the target, so the pointer affordance and the
 * focus ring describe the same rectangle.
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
    <li data-chapter={entry.chapter} data-part={entry.id} className="manifest-row">
      <a
        href={entry.href}
        className="relative flex min-h-12 items-center gap-3 border-b border-graphite-800 py-2 text-graphite-100 transition-colors duration-fast hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
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
          // h-12 w-12, not h-10: this config REPLACES Tailwind's spacing scale
          // with 0,1,2,3,4,6,8,12,16,20,24,32 (tailwind.config.js), so `h-10`
          // generates no CSS at all and the image falls back to `height:auto` --
          // the piston rendered 118px tall inside a 48px row. Same silent
          // off-scale-utility failure P11.S3 hit with `w-11`.
          className="h-12 w-12 flex-none object-contain"
        />
        <span className="flex-1 text-body-sm">{name}</span>
        <span className="font-mono text-caption text-graphite-400">{entry.system}</span>
        {/* Omitted, never rendered as zero, when the API could not answer --
            `getSystemPartCounts` returns null for "unknown", and a fabricated
            "۰ قطعه" would read as real out-of-stock data. */}
        {count !== null ? (
          <span className="font-mono text-caption text-graphite-400">{count}</span>
        ) : null}
        <span className="sr-only">{action}</span>
      </a>
    </li>
  );
}

/**
 * The mobile form (§2.2): the same parts as a compact horizontal rail under the
 * stage, snap-scrolled, same links, same accumulate rule.
 *
 * A chip drops the SYS code and keeps thumbnail, name and count. The code earns
 * its place in a full-width row where there is space for it; in a 9rem chip it
 * would push the part's own name to a second line, and the name is the thing a
 * visitor is scanning for.
 */
function ManifestChip({
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
      // w-32, not w-36: the spacing scale is REPLACED with
      // 0,1,2,3,4,6,8,12,16,20,24,32, so `w-36` generates nothing and
      // `flex-none` then sizes each chip to its own text -- measured 74px to
      // 99px, a visibly ragged rail. Same silent failure as `h-10` above, and
      // as the audit's own item 2 where a `w-64` card computed to 992px.
      className="manifest-row manifest-chip w-32 flex-none snap-start"
    >
      <a
        href={entry.href}
        className="relative flex h-full min-h-12 flex-col gap-1 border border-graphite-800 p-3 text-graphite-100 transition-colors duration-fast hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        <img
          src={landingFallback(asset)}
          srcSet={landingSrcSet(asset)}
          sizes={`${THUMB_CSS_PX}px`}
          width={THUMB_WIDTH}
          height={Math.round((asset.intrinsic.height / asset.intrinsic.width) * THUMB_WIDTH)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-12 w-12 object-contain"
        />
        <span className="text-body-sm">{name}</span>
        {count !== null ? (
          <span className="font-mono text-caption text-graphite-400">{count}</span>
        ) : null}
        <span className="sr-only">{action}</span>
      </a>
    </li>
  );
}

/**
 * `panel` is the desktop side list, `rail` the mobile chip strip. Both render
 * on every request and CSS shows exactly one -- `hidden` is `display:none`, so
 * the other is out of the accessibility tree entirely and there is never a
 * duplicate navigation landmark.
 */
export async function PartsManifest({ variant }: { variant: "panel" | "rail" }) {
  if (MANIFEST_HIDDEN) return null;

  const t = await getTranslations("Landing.manifest");
  const counts = await getSystemPartCounts();
  const entries = manifestEntries();
  const isPanel = variant === "panel";

  const rows = entries.map((entry) => {
    const props = {
      entry,
      name: t(`parts.${entry.nameKey}`),
      count:
        counts[entry.system] === null
          ? null
          : // Persian digits, per the system rail beside it -- see the note there.
            t("partsCount", { count: toPersianDigits(counts[entry.system] as number) }),
      action: t("rowAction"),
    };
    return isPanel ? (
      <ManifestRow key={entry.id} {...props} />
    ) : (
      <ManifestChip key={entry.id} {...props} />
    );
  });

  return (
    <nav
      aria-label={t("navLabel")}
      className={isPanel ? "hidden flex-col gap-3 lg:flex" : "flex flex-col gap-3 lg:hidden"}
    >
      <h2 className="text-body font-bold text-graphite-0">{t("title")}</h2>
      {/* Read instead of the choreography, which a screen reader never sees. */}
      <p className="sr-only">{t("intro")}</p>
      {/* `data-chapter-reached` starts at the LAST chapter, not the first: with
          no JavaScript, or with reduced motion, every row must already be
          present (§2.3). The client leaf below only ever takes rows *away* --
          and only once it knows it can animate them back in. */}
      <ManifestCheckIn>
        <ol
          className={
            isPanel
              ? "manifest-list flex flex-col"
              : "manifest-list flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
          }
          data-chapter-reached="3"
        >
          {rows}
        </ol>
        {/* Must stay the list's immediately next sibling -- it finds the list
            through `currentScript.previousElementSibling` rather than an id,
            because this component renders twice on every page. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
      </ManifestCheckIn>
    </nav>
  );
}
