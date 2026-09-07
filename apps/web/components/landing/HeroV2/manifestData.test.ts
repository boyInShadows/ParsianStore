import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CATALOG_SYSTEMS } from "schemas";
import {
  CHAPTER_SEQUENCE,
  HERO_BAY,
  HERO_ENGINE_CHAPTER,
  HERO_ENGINE_PARTS,
  HERO_LAYERS,
  beatOf,
  coverOf,
} from "./heroLayout.js";
import {
  MANIFEST_EXCLUDED_LAYERS,
  calloutSubjectByLayerId,
  calloutSubjects,
  manifestByChapter,
  manifestEntries,
  manifestPartByLayerId,
} from "./manifestData.js";
import { landingAsset } from "../../../lib/landing-image.js";

/**
 * fableTasks2 §S2 names one risk for this step -- "route drift: assert at
 * build that every manifest route exists" -- and the drift it is afraid of is
 * real: every SYS code in the plan's own §2.4 table pointed at the wrong
 * system. These tests are the assertion.
 *
 * They also cover the failure the plan does not name: a sprite added to the
 * scene later with nobody remembering the manifest, which would ship a part
 * that undocks with no row and no name.
 */

const MESSAGES = JSON.parse(
  readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../messages/fa.json"),
    "utf8",
  ),
) as { Landing: { manifest: Record<string, unknown> } };

/**
 * Every layer a row is allowed to name: the car's own sprites plus the engine
 * parts under the hood. Built the same way `manifestData.ts` builds it, because
 * a test that knew about only half the scene is exactly how the chapter check
 * started passing for six rows and breaking on the seventh.
 */
const SCENE = [
  ...HERO_LAYERS.map((layer) => ({ id: layer.id, chapter: layer.chapter })),
  ...HERO_ENGINE_PARTS.map((part) => ({ id: part.id, chapter: HERO_ENGINE_CHAPTER })),
];

const manifestStrings = MESSAGES.Landing.manifest;
const partStrings = manifestStrings.parts as Record<string, string>;
const chapterStrings = manifestStrings.chapters as Record<string, string>;
const whyStrings = (manifestStrings as unknown as { why: Record<string, string> }).why;

describe("parts manifest data (P12.S2)", () => {
  it("routes every row to a category that exists", () => {
    const slugs = new Set(CATALOG_SYSTEMS.map((system) => system.slug));
    for (const entry of manifestEntries()) {
      expect(slugs, `${entry.id} routes to a system that does not exist`).toContain(
        entry.systemSlug,
      );
      // The exact shape the system index renders. If /c/[slug] ever moves,
      // both this and SystemIndex have to move together, and this fails first.
      expect(entry.href).toBe(`/c/${entry.systemSlug}`);
    }
  });

  it("gives every row a system code the catalogue actually defines", () => {
    const codes = new Set(CATALOG_SYSTEMS.map((system) => system.code));
    for (const entry of manifestEntries()) {
      expect(codes, `${entry.id} carries an unknown SYS code`).toContain(entry.system);
    }
  });

  // The specific bug this repo already had once: the plan's table said
  // SYS-09 for body parts, and SYS-09 is `interior`.
  it("does not file body panels under the interior system", () => {
    const bodyParts = ["grille", "bumper", "hood", "fender", "door"];
    const byId = new Map(manifestEntries().map((entry) => [entry.id, entry]));
    for (const id of bodyParts) {
      expect(byId.get(id)?.systemSlug, `${id} should be sold as a body part`).toBe("body-exterior");
    }
    expect(byId.get("headlights")?.systemSlug).toBe("electrical");
  });

  it("accounts for every layer in the scene, as a row or a stated exclusion", () => {
    const mapped = new Set(manifestEntries().flatMap((entry) => entry.layerIds));
    const excluded = new Set(Object.keys(MANIFEST_EXCLUDED_LAYERS));

    for (const layer of SCENE) {
      const accounted = mapped.has(layer.id) || excluded.has(layer.id);
      expect(
        accounted,
        `hero layer "${layer.id}" has no manifest row and no recorded reason for not having ` +
          `one -- it would undock un-named. Add it to PARTS, or to ` +
          `MANIFEST_EXCLUDED_LAYERS with why.`,
      ).toBe(true);
    }
  });

  it("excludes only layers that are really in the scene", () => {
    const layerIds = new Set(SCENE.map((layer) => layer.id));
    for (const [id, reason] of Object.entries(MANIFEST_EXCLUDED_LAYERS)) {
      expect(layerIds, `"${id}" is excluded but no longer exists`).toContain(id);
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it("never lets two rows claim the same sprite", () => {
    const seen = new Set<string>();
    for (const entry of manifestEntries()) {
      for (const layerId of entry.layerIds) {
        expect(seen, `${layerId} is claimed twice`).not.toContain(layerId);
        seen.add(layerId);
      }
    }
    expect(manifestPartByLayerId().size).toBe(seen.size);
  });

  it("has real Persian for every row and chapter, with no Latin leaking in", () => {
    for (const entry of manifestEntries()) {
      const name = partStrings[entry.nameKey];
      expect(name, `no fa.json string for ${entry.nameKey}`).toBeTruthy();
      // A Latin character here means an untranslated placeholder survived.
      expect(name, `${entry.nameKey} is not Persian`).not.toMatch(/[A-Za-z]/);
    }
    for (const chapter of manifestByChapter().keys()) {
      expect(chapterStrings[String(chapter)], `chapter ${chapter} has no label`).toBeTruthy();
    }
  });

  it("carries no string the stage does not render", () => {
    // "Rendered" widened at P13.S3 and the wording is the point: a part name is
    // now used by a manifest row *or* by a stage callout, and the windshield is
    // the one that is only ever the second. Left as rows-only, this guard would
    // have read "fa.json names windshield, which no row uses" -- true, and the
    // wrong conclusion, because the string is on screen every time chapter 3
    // lifts the glass off the car.
    const used = new Set(calloutSubjects().map((subject) => subject.nameKey));
    for (const entry of manifestEntries()) used.add(entry.nameKey);

    for (const key of Object.keys(partStrings)) {
      expect(used, `fa.json names "${key}", which nothing on the stage renders`).toContain(key);
    }
  });

  it("has a why-line for every callout, and none for anything else", () => {
    // The why-line is what turns "a thing moved" into "we sell this" (§1.3), so
    // a subject without one renders a plate with a hole in it. The reverse
    // matters too: a stray line is copy nobody will ever see, which is how a
    // locale file rots.
    const why = whyStrings;
    const subjects = calloutSubjects().map((subject) => subject.nameKey);

    for (const key of subjects) {
      expect(why[key], `no why-line for "${key}"`).toBeTruthy();
      expect(why[key], `${key}'s why-line is not Persian`).not.toMatch(/[A-Za-z]/);
    }
    expect(Object.keys(why).sort()).toEqual([...subjects].sort());
  });

  it("orders rows by the chapter that checks them in", () => {
    const chapters = manifestEntries().map((entry) => entry.chapter);
    expect(chapters).toEqual([...chapters].sort((a, b) => a - b));
  });

  /**
   * The scene as it actually plays, built from the table `StationOutline`
   * reads: each chapter's cover opens first (the hood is the lid over chapter
   * 2, not one of its beats), then that chapter's slots in sequence.
   */
  const SCENE_ORDER = ([1, 2, 3] as const).flatMap((chapter) => {
    const cover = coverOf(chapter);
    return [...(cover ? [[cover]] : []), ...CHAPTER_SEQUENCE[chapter]];
  });

  // The defect this pins: rows were rendered in *paint* order (chapter, then
  // position in HERO_LAYERS) while they tick in *scene* order, and the two
  // disagree inside a chapter -- chapter 1 paints grille → headlights → bumper
  // while the headlights leave first, chapter 3 paints fender → door while the
  // door leaves first.
  it("renders rows in the order the parts actually leave the car", () => {
    const byLayer = manifestPartByLayerId();
    const expected = SCENE_ORDER.map((ids) => byLayer.get(ids[0]!)?.id).filter(
      (id): id is string => id !== undefined,
    );

    expect(manifestEntries().map((entry) => entry.id)).toEqual(expected);
  });

  // The same claim stated as arithmetic, so a retuned beat cannot satisfy the
  // sequence check above and still put the list out of order.
  it("lists rows by ascending check-in, never by how the sprites are stacked", () => {
    const checkIns = manifestEntries().map((entry) => entry.checkInAt);
    expect(checkIns).toEqual([...checkIns].sort((a, b) => a - b));
  });

  /**
   * The visible symptom, tested the way a visitor meets it.
   *
   * `ManifestCheckIn` counts how many rows are behind the playhead and marks
   * that many *from the top of the rendered list*. An unchecked row keeps its
   * height rather than collapsing (globals.css: "never `display: none`"), so
   * the instant a row ticks in while a row above it has not, the job card shows
   * a blank slot in the middle of the list.
   */
  it("never checks a row in while a row above it is still blank", () => {
    const entries = manifestEntries();
    for (let step = 0; step <= 100; step += 1) {
      const p = step / 100;
      const checked = entries.map((entry) => entry.checkInAt <= p);
      const firstBlank = checked.indexOf(false);
      if (firstBlank === -1) continue;
      const strays = entries.filter((entry, index) => index > firstBlank && checked[index]);
      expect(
        strays.map((entry) => entry.id),
        `at progress ${p.toFixed(2)} the list shows a gap: ${entries[firstBlank]!.id} is still ` +
          `blank while a row below it has checked in`,
      ).toEqual([]);
    }
  });

  // The exact reading from the report: eight of nine ticked, and the eighth was
  // the door with the fender above it still empty.
  it("has the door and the fender in the order they detach", () => {
    const ids = manifestEntries().map((entry) => entry.id);
    expect(ids.indexOf("door")).toBeLessThan(ids.indexOf("fender"));
    expect(ids.indexOf("headlights")).toBeLessThan(ids.indexOf("grille"));
  });

  it("keeps each part inside a single chapter", () => {
    const layerChapter = new Map(SCENE.map((layer) => [layer.id, layer.chapter]));
    for (const entry of manifestEntries()) {
      for (const layerId of entry.layerIds) {
        expect(layerChapter.get(layerId), `${entry.id} spans chapters`).toBe(entry.chapter);
      }
    }
  });

  // The beat only works if a closed car is closed. The hood's docked box is the
  // bay, so anything that is supposed to be hidden under it has to be inside
  // that box -- a part poking out would be visible before the visitor scrolls,
  // and the hero's whole premise is that the car arrives whole.
  it("hides every engine part inside the bay the hood covers", () => {
    for (const part of HERO_ENGINE_PARTS) {
      const asset = landingAsset(`/landing/hero-parts/${part.asset}`);
      const width = part.place.height * (asset.intrinsic.width / asset.intrinsic.height);
      const box = {
        left: part.place.cx - width / 2,
        right: part.place.cx + width / 2,
        top: part.place.cy - part.place.height / 2,
        bottom: part.place.cy + part.place.height / 2,
      };
      expect(box.left, `${part.id} sticks out past the front of the bay`).toBeGreaterThanOrEqual(
        HERO_BAY.left,
      );
      expect(box.right, `${part.id} sticks out past the back of the bay`).toBeLessThanOrEqual(
        HERO_BAY.right,
      );
      expect(box.top, `${part.id} sticks out above the bay`).toBeGreaterThanOrEqual(HERO_BAY.top);
      expect(box.bottom, `${part.id} sticks out below the bay`).toBeLessThanOrEqual(
        HERO_BAY.bottom,
      );
    }
  });

  // The parts travel down, into the clear band under the car, because the
  // lifted hood already owns the band above it. If an undock ever sent one back
  // up there it would vanish behind the hood, which is what the first attempt
  // did to the alternator.
  it("sends every engine part clear of the car rather than behind the hood", () => {
    for (const part of HERO_ENGINE_PARTS) {
      expect(part.undock.dy, `${part.id} travels up into the hood's space`).toBeGreaterThan(0);
      expect(
        part.place.cy + part.undock.dy,
        `${part.id} stops before it clears the car body`,
      ).toBeGreaterThan(700);
    }
  });

  // Both headlight sockets are one part. If they ever stop sharing a row the
  // manifest would list the same lamp twice and highlight half of it.
  it("treats the two headlight sockets as one part", () => {
    const headlights = manifestEntries().find((entry) => entry.id === "headlights");
    expect(headlights?.layerIds).toEqual(["lamp-far", "lamp-near"]);
    const byLayer = manifestPartByLayerId();
    expect(byLayer.get("lamp-far")).toBe(byLayer.get("lamp-near"));
  });
});

describe("callout subjects", () => {
  it("labels every part in the scene, including the one with nothing to sell", () => {
    const subjects = calloutSubjects();
    const labelled = new Set(subjects.flatMap((subject) => subject.layerIds));
    const scene = [...HERO_LAYERS.map((l) => l.id), ...HERO_ENGINE_PARTS.map((p) => p.id)];

    // Every sprite that moves gets a name. A part that slides off the car
    // un-named is exactly the defect this phase exists to fix, so it is worth a
    // failing test rather than a review comment.
    for (const id of scene) {
      expect(labelled.has(id), `layer "${id}" undocks with no callout`).toBe(true);
    }
  });

  it("gives the windshield a name and no link, rather than a link to nowhere", () => {
    const windshield = calloutSubjects().find((subject) => subject.id === "windshield");
    expect(windshield, "the windshield lost its callout").toBeDefined();
    expect(windshield!.href).toBeNull();
    expect(windshield!.system).toBeNull();
  });

  it("keeps a link on every part the catalogue actually sells", () => {
    for (const entry of manifestEntries()) {
      const subject = calloutSubjects().find((candidate) => candidate.id === entry.id);
      expect(subject?.href, `${entry.id} is sold but its callout has no route`).toBe(entry.href);
    }
  });

  // The plates narrate the scene, so their order is the scene's. Chapter order
  // alone was not enough: an unsold subject is appended after the rows, so it
  // landed last in its chapter regardless of when it actually moves, and the
  // windshield genuinely being last in chapter 3 hid that.
  it("orders every label by the beat it belongs to", () => {
    const beats = calloutSubjects().map(
      (subject) => beatOf(subject.chapter, subject.layerIds[0]!)[0] ?? 0,
    );
    expect(beats).toEqual([...beats].sort((a, b) => a - b));
  });

  it("pairs both headlight sprites to one label", () => {
    const byLayer = calloutSubjectByLayerId();
    expect(byLayer.get("lamp-far")).toBe(byLayer.get("lamp-near"));
  });
});
