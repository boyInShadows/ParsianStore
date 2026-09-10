import type { CatalogSystemCode } from "schemas";

/**
 * A line drawing of each of the ten systems, in the register of a workshop
 * manual rather than an icon set (P12.S9, recording defect 3).
 *
 * These exist so the missing-photo state can be *a diagram* instead of an
 * apology. The rule they are drawn to: stroke only, no fill, one weight, and
 * recognisable at 64px -- a part you could point at, not a pictogram of a
 * category. `currentColor` throughout, so the plate decides the ink.
 *
 * 48-unit viewBox rather than the 24 the primitives use: these are drawn large
 * on a card, and 24 units forces details onto half-pixels.
 */
const GLYPHS: Record<CatalogSystemCode, React.ReactNode> = {
  // Engine block: four cylinders on a crankcase.
  "SYS-01": (
    <>
      <path d="M8 30h32v10H8z" />
      <path d="M12 30V18h20v12" />
      <path d="M16 18v-6h4v6M24 18v-6h4v6" />
      <path d="M32 24h6v6h-6" />
      <path d="M14 40v4M34 40v4" />
    </>
  ),
  // Gearbox: a gear on a shaft.
  "SYS-02": (
    <>
      <circle cx="20" cy="24" r="9" />
      <circle cx="20" cy="24" r="3.5" />
      <path d="M20 11v4M20 33v4M7 24h4M29 24h4M11 15l3 3M26 30l3 3M29 15l-3 3M14 30l-3 3" />
      <path d="M33 24h9M38 20v8" />
    </>
  ),
  // Strut: coil spring over a damper.
  "SYS-03": (
    <>
      <path d="M24 6v6" />
      <path d="M16 12h16" />
      <path d="M16 16h16M16 21h16M16 26h16M16 31h16" />
      <path d="M20 34h8v8h-8z" />
      <path d="M24 42v-8" />
    </>
  ),
  // Brake disc with caliper.
  "SYS-04": (
    <>
      <circle cx="22" cy="24" r="14" />
      <circle cx="22" cy="24" r="5" />
      <path d="M32 14l4-4M36 34l-4-4" />
      <path d="M34 16h6v16h-6a8 8 0 0 1 0-16z" />
    </>
  ),
  // Battery with terminals.
  "SYS-05": (
    <>
      <path d="M8 16h32v24H8z" />
      <path d="M14 16v-4h6v4M28 16v-4h6v4" />
      <path d="M16 28h8M20 24v8" />
      <path d="M28 28h8" />
    </>
  ),
  // Body panel: a door with a window line.
  "SYS-06": (
    <>
      <path d="M10 14h20l8 8v20H10z" />
      <path d="M14 18h14l5 5H14z" />
      <path d="M14 32h8" />
      <path d="M30 30h4" />
    </>
  ),
  // Radiator core with a fan.
  "SYS-07": (
    <>
      <path d="M6 12h24v24H6z" />
      <path d="M12 12v24M18 12v24M24 12v24" />
      <circle cx="38" cy="24" r="8" />
      <path d="M38 16v16M30 24h16" />
    </>
  ),
  // Muffler and tailpipe.
  "SYS-08": (
    <>
      <path d="M6 22h10" />
      <path d="M16 16h18v16H16z" />
      <path d="M34 20h6a4 4 0 0 1 0 8h-6" />
      <path d="M22 16v16M28 16v16" />
    </>
  ),
  // Seat profile.
  "SYS-09": (
    <>
      <path d="M14 10h8a4 4 0 0 1 4 4v14H14z" />
      <path d="M14 28h22a4 4 0 0 1 4 4v6H14z" />
      <path d="M18 38v6M36 38v6" />
    </>
  ),
  // Spin-on oil filter with a drop.
  "SYS-10": (
    <>
      <path d="M14 14h20v24a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" />
      <path d="M18 8h12v6H18z" />
      <path d="M14 22h20" />
      <path d="M38 30c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6z" />
    </>
  ),
};

/**
 * `title` is deliberately absent: every place this renders already names the
 * system in text beside it, and an SVG that repeats it makes a screen reader
 * say it twice. It is decoration for an adjacent label, so it is hidden.
 */
export function SystemGlyph({ code, className }: { code: CatalogSystemCode; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {GLYPHS[code]}
    </svg>
  );
}

export function hasSystemGlyph(code: string | undefined): code is CatalogSystemCode {
  return code !== undefined && code in GLYPHS;
}
