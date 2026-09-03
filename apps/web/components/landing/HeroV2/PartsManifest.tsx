import { getTranslations } from "next-intl/server";
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
 * Hidden until P12.S5 turns it on, which is the step that adds the mobile chip
 * rail and flips it for real. The repo has no feature-flag mechanism -- the
 * living convention is a named module constant with a comment saying what
 * flips it (`SECTION_HIDDEN` in `Newsletter.tsx` and `GuidesTeaser.tsx`), so
 * this follows that rather than inventing an env var nothing sets.
 */
const MANIFEST_HIDDEN = true;

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

export async function PartsManifest() {
  if (MANIFEST_HIDDEN) return null;

  const t = await getTranslations("Landing.manifest");
  const counts = await getSystemPartCounts();
  const entries = manifestEntries();

  return (
    <nav aria-label={t("navLabel")} className="hidden flex-col gap-3 lg:flex">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body font-bold text-graphite-0">{t("title")}</h2>
      </div>
      {/* Read instead of the choreography, which a screen reader never sees. */}
      <p className="sr-only">{t("intro")}</p>
      {/* `data-chapter-reached` starts at the LAST chapter, not the first: with
          no JavaScript, or with reduced motion, every row must already be
          present (§2.3). The client leaf below only ever takes rows *away* --
          and only once it knows it can animate them back in. */}
      <ManifestCheckIn>
        <ol className="manifest-list flex flex-col" data-chapter-reached="3">
          {entries.map((entry) => (
            <ManifestRow
              key={entry.id}
              entry={entry}
              name={t(`parts.${entry.nameKey}`)}
              count={
                counts[entry.system] === null
                  ? null
                  : t("partsCount", { count: counts[entry.system] as number })
              }
              action={t("rowAction")}
            />
          ))}
        </ol>
      </ManifestCheckIn>
    </nav>
  );
}
