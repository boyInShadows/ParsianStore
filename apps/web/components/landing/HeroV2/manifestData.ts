import { CATALOG_SYSTEMS, type CatalogSystemCode } from "schemas";
import {
  HERO_ENGINE_CHAPTER,
  HERO_ENGINE_PARTS,
  HERO_LAYERS,
  beatOf,
  type HeroLayer,
} from "./heroLayout";

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
 * That leaves nine rows across four systems. Six of them were all there was at
 * P12.S2: §2.1 gives piston, alternator and air filter to chapter 2, but the
 * scene had exactly one chapter-2 layer, the hood -- P9.S5 planned the three
 * engine cutouts and never docked them. P12.S3 put them in the bay
 * (`HERO_ENGINE_PARTS`), and because rows are derived from the scene they
 * appeared here on their own. Without them, five of six rows led to
 * `/c/body-exterior`; with them the manifest reaches engine, electrical and
 * filters too, which is what "by the end of the hero the manifest is the store"
 * was asking for.
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
  /** Manifest name of the asset used for the row's thumbnail. */
  readonly asset: string;
  /**
   * Which pipeline group that asset lives in. The car's own panels are hero
   * sprites cut from the render; the engine internals are catalogue product
   * shots in `hero-parts`, so the two are fetched from different directories.
   */
  readonly assetGroup: "hero" | "hero-parts";
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
    assetGroup: "hero",
    system: "SYS-05",
    nameKey: "headlights",
  },
  {
    id: "grille",
    layerIds: ["grille"],
    asset: "sprite-grille",
    assetGroup: "hero",
    system: "SYS-06",
    nameKey: "grille",
  },
  {
    id: "bumper",
    layerIds: ["bumper"],
    asset: "sprite-bumper",
    assetGroup: "hero",
    system: "SYS-06",
    nameKey: "bumper",
  },
  {
    id: "hood",
    layerIds: ["hood"],
    asset: "sprite-hood",
    assetGroup: "hero",
    system: "SYS-06",
    nameKey: "hood",
  },
  {
    id: "fender",
    layerIds: ["fender"],
    asset: "sprite-fender",
    assetGroup: "hero",
    system: "SYS-06",
    nameKey: "fender",
  },
  {
    id: "door",
    layerIds: ["door"],
    asset: "sprite-door",
    assetGroup: "hero",
    system: "SYS-06",
    nameKey: "door",
  },
  {
    id: "air-filter",
    layerIds: ["air-filter"],
    asset: "air-filter",
    assetGroup: "hero-parts",
    system: "SYS-10",
    nameKey: "airFilter",
  },
  {
    id: "piston",
    layerIds: ["piston"],
    asset: "piston",
    assetGroup: "hero-parts",
    system: "SYS-01",
    nameKey: "piston",
  },
  {
    id: "alternator",
    layerIds: ["alternator"],
    asset: "alternator",
    assetGroup: "hero-parts",
    system: "SYS-05",
    nameKey: "alternator",
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
  /**
   * The scroll progress at which this row checks in: the moment its own part
   * starts leaving the car (P13.S4).
   *
   * Per part, not per chapter. Until now a row appeared when its *chapter*
   * opened, so all three of chapter 1's rows arrived together while the
   * headlights were still the only thing moving -- the list said three parts
   * had come off while the visitor could see one. Read from `beatOf` rather
   * than restated, so a retuned BEAT_SPAN moves the rows with the parts.
   */
  readonly checkInAt: number;
};

const systemByCode = new Map(CATALOG_SYSTEMS.map((system) => [system.code, system]));

/**
 * Everything in the scene a row can point at: the lookup a row uses to find its
 * own layer, and nothing more.
 *
 * The index a layer happens to sit at here is *not* the order the list reads
 * in. `HERO_LAYERS` is a paint order -- `HeroStage` maps over it to stack the
 * sprites, so the engine internals are drawn beneath the hood and a closed car
 * is closed -- and depth has no reason to agree with the order the parts leave
 * the car. It does not: chapter 1 paints grille → headlights → bumper while the
 * headlights detach first, and chapter 3 paints fender → door while the door
 * goes first. `manifestEntries()` therefore sorts by check-in time and uses
 * this index only to break a tie, so the paint order stays exactly where it
 * belongs -- in the stage -- and never leaks into the list.
 */
const SCENE: readonly { readonly id: string; readonly chapter: HeroLayer["chapter"] }[] = [
  ...HERO_LAYERS.map((layer) => ({ id: layer.id, chapter: layer.chapter })),
  ...HERO_ENGINE_PARTS.map((part) => ({ id: part.id, chapter: HERO_ENGINE_CHAPTER })),
];

const layerById = new Map(SCENE.map((layer) => [layer.id, layer]));
const paintOrder = new Map(SCENE.map((layer, index) => [layer.id, index]));

/**
 * The manifest, in the order the parts actually check in.
 *
 * Sorted by `checkInAt` -- each row's own beat -- rather than by chapter and
 * paint index. That distinction is not cosmetic: rows tick in scene order
 * (`CHAPTER_SEQUENCE`) but used to be *rendered* in paint order, and the two
 * disagree inside a chapter. At progress 0.74 the list had the door ticked and
 * the fender, one row above it, still blank; because an unchecked row keeps its
 * height rather than collapsing (globals.css), that read as an empty slot in
 * the middle of the job card.
 *
 * Ordering by check-in is also what makes the accumulate rule (§2.1) legible --
 * a row appearing at the end of a list the visitor has already read is a very
 * different thing from one appearing in the middle of it -- and it keeps this
 * list in step with `StationOutline`, which reads `CHAPTER_SEQUENCE` directly.
 * Chapter order falls out of it for free: the chapters own disjoint, ascending
 * progress ranges, so a chapter-2 beat cannot start before a chapter-1 one.
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
      // the entry: it is a tie-break, not something the UI has any business
      // reading, and looking it up again after the map would reintroduce the
      // "first element might not exist" problem this guard just settled. Two
      // parts cannot share a beat today -- BEAT_SPAN staggers every slot -- so
      // this only ever decides an order that a retune could otherwise leave to
      // whatever the sort happened to do.
      paintIndex: paintOrder.get(first.id) ?? 0,
      entry: {
        ...part,
        chapter: first.chapter,
        checkInAt: beatOf(first.chapter, first.id)[0] ?? 0,
        systemSlug: system.slug,
        systemNameFa: system.name.fa,
        href: `/c/${system.slug}`,
      },
    };
  });

  return ordered
    .sort((a, b) => a.entry.checkInAt - b.entry.checkInAt || a.paintIndex - b.paintIndex)
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

/**
 * A part the stage can put a label on (fableTasks v1.1 §1.3, P13.S1).
 *
 * Nearly the manifest, but not quite, and the difference is the point. The
 * manifest is a list of things you can buy; the callouts are a narration of
 * what is happening on screen. Nine parts are both. The **windshield** is only
 * the second: it undocks in chapter 3 and has no category route to send anyone
 * to, so it is a real event in the scene with nothing behind it.
 *
 * The alternative was to stop animating it, and that is worse -- a car whose
 * windscreen stays welded on while every panel around it lifts away is not a
 * simpler scene, it is a scene with a hole in it. So it moves, it gets a name,
 * and `href` is `null` so it can never render as a link to nowhere. "Every
 * detachment is a sale" holds for everything that is actually for sale, and
 * the one exception says so out loud instead of being quietly faked.
 */
export type CalloutSubject = {
  readonly id: string;
  /** The sprites this label belongs to. Two, for the headlights. */
  readonly layerIds: readonly string[];
  readonly chapter: HeroLayer["chapter"];
  /** Key under `Landing.manifest.parts`. Also the key under `.why`. */
  readonly nameKey: string;
  /** The category route, or `null` for a part the catalogue does not sell. */
  readonly href: string | null;
  /** The system code shown on the plate, or `null` where there is none. */
  readonly system: CatalogSystemCode | null;
};

/**
 * Every label the stage renders, in the order the parts leave the car.
 *
 * Derived from the manifest plus `MANIFEST_EXCLUDED_LAYERS`, so the two can
 * never drift: a layer that gains a category route becomes a row and a linked
 * callout in the same edit, and one that loses its route degrades to a
 * name-only plate instead of a 404.
 *
 * Sorted on the beat itself rather than on the chapter. Sorting by chapter
 * says nothing about the order *inside* one: an unsold subject is appended
 * after the rows, so it landed last in its chapter whether or not it detaches
 * last, and the windshield genuinely being last in chapter 3 made that look
 * settled. `beatOf` says when each one moves, so the claim above holds by
 * construction rather than by luck.
 */
export function calloutSubjects(): readonly CalloutSubject[] {
  const rows: CalloutSubject[] = manifestEntries().map((entry) => ({
    id: entry.id,
    layerIds: entry.layerIds,
    chapter: entry.chapter,
    nameKey: entry.nameKey,
    href: entry.href,
    system: entry.system,
  }));

  const unsold: CalloutSubject[] = Object.keys(MANIFEST_EXCLUDED_LAYERS).map((layerId) => {
    const layer = HERO_LAYERS.find((candidate) => candidate.id === layerId);
    if (!layer) {
      throw new Error(
        `MANIFEST_EXCLUDED_LAYERS names "${layerId}", which is not a hero layer. An exclusion ` +
          `has to exclude something that exists, or it is a note about a sprite that is gone.`,
      );
    }
    return {
      id: layer.id,
      layerIds: [layer.id],
      chapter: layer.chapter,
      nameKey: layer.id,
      href: null,
      system: null,
    };
  });

  return [...rows, ...unsold].sort(
    (a, b) =>
      (beatOf(a.chapter, a.layerIds[0]!)[0] ?? 0) - (beatOf(b.chapter, b.layerIds[0]!)[0] ?? 0),
  );
}

/** Which label a sprite belongs to, including the sprites with no manifest row. */
export function calloutSubjectByLayerId(): ReadonlyMap<string, CalloutSubject> {
  const byLayer = new Map<string, CalloutSubject>();
  for (const subject of calloutSubjects()) {
    for (const layerId of subject.layerIds) byLayer.set(layerId, subject);
  }
  return byLayer;
}
