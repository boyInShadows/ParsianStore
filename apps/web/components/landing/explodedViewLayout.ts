import { CATALOG_SYSTEMS, type CatalogSystemCode } from "schemas";

export type ExplodedNode = {
  code: CatalogSystemCode;
  slug: string;
  name: { fa: string; en: string };
  row: "top" | "bottom";
  /** Final (exploded) marker position. */
  x: number;
  y: number;
  /** Where this component's leader line meets the car silhouette. */
  anchorX: number;
  anchorY: number;
};

/**
 * Hand-tuned layout on a 1040x480 viewBox: 5 systems fan out above the car
 * silhouette, 5 below -- masterPlan.md §1.3's "hairline leader line and a
 * mono-set system code" per component. Assignment to top/bottom is purely
 * visual balance (evenly spaced, symmetric leader lines), not anatomical
 * accuracy -- this is a schematic in the parts-catalog vernacular (§6.1),
 * not a literal teardown diagram.
 *
 * Every label uses text-anchor="middle" (ExplodedView.tsx) specifically so
 * RTL/LTR bidi direction never affects where text starts -- centering is
 * anchor-direction-agnostic. The 40px side margins beyond the outermost
 * nodes (x=120 and x=920, canvas width 1040) exist so even the longest
 * Persian system name ("خنک‌کننده و تهویه مطبوع", ~22 chars) can extend
 * both directions from its centered anchor without clipping.
 */
const LAYOUT: Record<CatalogSystemCode, { row: "top" | "bottom"; x: number; anchorX: number }> = {
  "SYS-01": { row: "top", x: 120, anchorX: 340 },
  "SYS-02": { row: "top", x: 320, anchorX: 400 },
  "SYS-06": { row: "top", x: 520, anchorX: 520 },
  "SYS-07": { row: "top", x: 720, anchorX: 640 },
  "SYS-05": { row: "top", x: 920, anchorX: 700 },
  "SYS-03": { row: "bottom", x: 120, anchorX: 340 },
  "SYS-04": { row: "bottom", x: 320, anchorX: 400 },
  "SYS-09": { row: "bottom", x: 520, anchorX: 520 },
  "SYS-10": { row: "bottom", x: 720, anchorX: 640 },
  "SYS-08": { row: "bottom", x: 920, anchorX: 700 },
};

const TOP_MARKER_Y = 90;
const BOTTOM_MARKER_Y = 390;
const TOP_ANCHOR_Y = 195;
const BOTTOM_ANCHOR_Y = 285;

export const EXPLODED_VIEWBOX = "0 0 1040 480";

export const EXPLODED_NODES: ExplodedNode[] = CATALOG_SYSTEMS.map((system) => {
  const layout = LAYOUT[system.code];
  const y = layout.row === "top" ? TOP_MARKER_Y : BOTTOM_MARKER_Y;
  const anchorY = layout.row === "top" ? TOP_ANCHOR_Y : BOTTOM_ANCHOR_Y;
  return {
    code: system.code,
    slug: system.slug,
    name: system.name,
    row: layout.row,
    x: layout.x,
    y,
    anchorX: layout.anchorX,
    anchorY,
  };
});
