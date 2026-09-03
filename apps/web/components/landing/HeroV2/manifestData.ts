import { CATALOG_SYSTEMS, type CatalogSystemCode } from "schemas";
import { HERO_LAYERS, type HeroLayer } from "./heroLayout";

/**
 * The parts manifest: the numbered list a workshop manual prints beside its
 * exploded drawing (fableTasks2 §2).
 *
 * This module is the data half only -- P12.S2 ships no UI. It exists so the
 * panel (S3) and the mobile chip rail (S4) render from one resolved source
 * rather than each re-deriving names, codes and routes.
 *
 * ## Everything here was resolved against the repo, not transcribed
 *
 * fableTasks2 §2.4 prints a nine-row table and says in the same breath that
 * its codes and routes are "placeholders from memory" the agent must resolve.
 * They needed it -- every code in that table was wrong:
 *
 * - `SYS-09` was given as "body". `SYS-09` is `interior`; body is `SYS-06`.
 * - Headlights were given `SYS-06 lighting`. There is no lighting system. The
 *   catalogue seeds "چراغ جلو" (Headlight Assembly) under `electrical`, so
 *   `SYS-05` is where a headlight row honestly points.
 * - Air filter was given `SYS-02 filters`. `SYS-02` is `transmission`;
 *   filters are `SYS-10`.
 *
 * ## Why six rows and not nine
 *
 * Two of the table's nine are absent, for reasons that differ:
 *
 * **Windshield** is dropped by §2.4's own rule -- it "ships in the manifest
 * only if a glass category route exists". None does: the catalogue's only
 * glass (شیشه بغل جلو) sits inside `body-exterior`, and there is no
 * `/c/glass`. The sprite still undocks in chapter 3; it simply gets no row.
 *
 * **Piston, alternator and air filter** are absent because they are not in
 * the scene. §2.1 gives them chapter 2, but `HERO_LAYERS` has exactly one
 * chapter-2 layer (the hood) -- the three engine cutouts P9.S5 planned were
 * never docked, though `public/landing/cutouts/` ships all three optimized.
 * Adding them is scene work with dock calibration, not a data edit, so it is
 * not this step's to do. It is also the difference between a manifest that
 * spreads across four systems and this one, where five of six rows lead to
 * `/c/body-exterior`. Raised with the owner at the S2/S3 boundary.
 *
 * ## Why rows are derived from HERO_LAYERS rather than listed
 *
 * The manifest is an index *of the diagram*. A row for a part that does not
 * undock would highlight nothing, and a sprite with no row would undock
 * un-named -- so the scene is the source of truth and `manifestEntries()`
 * reads from it. `manifestData.test.ts` fails if a new layer appears without
 * either a part mapping or a deliberate exclusion, which is what stops the
 * next person who adds a sprite from silently shipping an incomplete list.
 */

/**
 * A part as the manifest presents it: the thing in the drawing, and the
 * system it is sold under.
 *
 * `layerIds` is a list because one part can be more than one sprite -- the
 * headlights render as `lamp-far` and `lamp-near`, two clipped instances of a
 * single file seated in two sockets (heroLayout.ts). They are one part in the
 * manifest and must highlight together.
 */
export type ManifestPart = {
  readonly id: string;
  readonly layerIds: readonly string[];
  /** Asset under `/landing/hero/`, for the row's thumbnail (S3). */
  readonly asset: string;
  /** The catalogue system this part is sold under. */
  readonly system: CatalogSystemCode;
  /** Key under `Landing.manifest.parts` in the locale files. */
  readonly nameKey: string;
};

/**
 * Layers that deliberately have no row, with the reason.
 *
 * Present so the coverage test can tell "excluded on purpose" from "nobody
 * has mapped this yet" -- silence would make those two identical.
 */
export const MANIFEST_EXCLUDED_LAYERS: Readonly<Record<string, string>> = {
  windshield:
    "fableTasks2 §2.4: ships only if a glass category route exists, and none does " +
    "-- the catalogue's glass sits inside body-exterior.",
};

/**
 * Part names are the catalogue's own wording wherever the catalogue sells the
 * part, so the row's promise matches what is on the other side of the link:
 * "چراغ جلو", "سپر جلو", "درب موتور" and "گلگیر جلو" are all seeded product
 * names (apps/api/src/seed/catalog.data.ts), not invented labels.
 *
 * Two are not. The grille has no seeded product, so it carries the ordinary
 * Persian term. The door is named «درب خودرو» rather than the catalogue's
 * component-level «دستگیره درب» / «نوار درب» because the drawing shows the
 * door itself -- and because a list that already carries «درب موتور» for the
 * hood needs the two to be unmistakable.
 */
const PARTS: readonly ManifestPart[] = [
  {
    id: "headlights",
    layerIds: ["lamp-far", "lamp-near"],
    asset: "sprite-headlights",
    system: "SYS-05",
    nameKey: "headlights",
  },
  {
    id: "grille",
    layerIds: ["grille"],
    asset: "sprite-grille",
    system: "SYS-06",
    nameKey: "grille",
  },
  {
    id: "bumper",
    layerIds: ["bumper"],
    asset: "sprite-bumper",
    system: "SYS-06",
    nameKey: "bumper",
  },
  {
    id: "hood",
    layerIds: ["hood"],
    asset: "sprite-hood",
    system: "SYS-06",
    nameKey: "hood",
  },
  {
    id: "fender",
    layerIds: ["fender"],
    asset: "sprite-fender",
    system: "SYS-06",
    nameKey: "fender",
  },
  {
    id: "door",
    layerIds: ["door"],
    asset: "sprite-door",
    system: "SYS-06",
    nameKey: "door",
  },
];

/** A resolved row: the part, plus everything the UI needs to draw it. */
export type ManifestEntry = ManifestPart & {
  readonly chapter: HeroLayer["chapter"];
  readonly systemSlug: string;
  readonly systemNameFa: string;
  /**
   * The category route. Identical to the system index's own link, so the
   * manifest never offers a second way into the same place (§2.4).
   */
  readonly href: string;
};

const systemByCode = new Map(CATALOG_SYSTEMS.map((system) => [system.code, system]));
const layerById = new Map(HERO_LAYERS.map((layer) => [layer.id, layer]));
const paintOrder = new Map(HERO_LAYERS.map((layer, index) => [layer.id, index]));

/**
 * The manifest, in the order the parts check in: chapter first, then the
 * order they are painted within it.
 *
 * Ordering by chapter is what makes the accumulate rule (§2.1) legible -- a
 * row appearing at the end of a list the visitor has already read is a very
 * different thing from one appearing in the middle of it.
 */
export function manifestEntries(): readonly ManifestEntry[] {
  const ordered = PARTS.map((part) => {
    const layers = part.layerIds.map((id) => {
      const layer = layerById.get(id);
      if (!layer) {
        throw new Error(
          `Manifest part "${part.id}" names hero layer "${id}", which no longer exists. ` +
            `The manifest indexes the diagram, so a row must point at a real sprite.`,
        );
      }
      return layer;
    });

    const first = layers[0];
    if (!first) {
      throw new Error(
        `Manifest part "${part.id}" lists no sprites. A row with nothing to highlight ` +
          `is a link the diagram cannot explain -- give it a layer or remove it.`,
      );
    }

    // One part, one beat: two sprites of the same part undocking in different
    // chapters would check their shared row in twice.
    const chapters = new Set(layers.map((layer) => layer.chapter));
    if (chapters.size !== 1) {
      throw new Error(
        `Manifest part "${part.id}" spans chapters ${[...chapters].join(", ")}. ` +
          `A row checks in once, so its sprites must undock together.`,
      );
    }

    const system = systemByCode.get(part.system);
    if (!system) {
      throw new Error(`Manifest part "${part.id}" names unknown system "${part.system}".`);
    }

    return {
      // The layer's own index in HERO_LAYERS, carried alongside rather than on
      // the entry: it is a sort key, not something the UI has any business
      // reading, and looking it up again after the map would reintroduce the
      // "first element might not exist" problem this guard just settled.
      paintIndex: paintOrder.get(first.id) ?? 0,
      entry: {
        ...part,
        chapter: first.chapter,
        systemSlug: system.slug,
        systemNameFa: system.name.fa,
        href: `/c/${system.slug}`,
      },
    };
  });

  return ordered
    .sort((a, b) => a.entry.chapter - b.entry.chapter || a.paintIndex - b.paintIndex)
    .map(({ entry }) => entry);
}

/** Rows grouped by the chapter that checks them in, for the panel's groups. */
export function manifestByChapter(): ReadonlyMap<HeroLayer["chapter"], readonly ManifestEntry[]> {
  const grouped = new Map<HeroLayer["chapter"], ManifestEntry[]>();
  for (const entry of manifestEntries()) {
    const bucket = grouped.get(entry.chapter);
    if (bucket) bucket.push(entry);
    else grouped.set(entry.chapter, [entry]);
  }
  return grouped;
}

/** Which row a sprite belongs to, for the sprite → row half of the highlight. */
export function manifestPartByLayerId(): ReadonlyMap<string, ManifestEntry> {
  const byLayer = new Map<string, ManifestEntry>();
  for (const entry of manifestEntries()) {
    for (const layerId of entry.layerIds) byLayer.set(layerId, entry);
  }
  return byLayer;
}
