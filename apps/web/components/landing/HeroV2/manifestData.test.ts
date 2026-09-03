import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CATALOG_SYSTEMS } from "schemas";
import { HERO_BAY, HERO_ENGINE_CHAPTER, HERO_ENGINE_PARTS, HERO_LAYERS } from "./heroLayout.js";
import {
  MANIFEST_EXCLUDED_LAYERS,
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

  it("carries no string the manifest does not render", () => {
    const used = new Set(manifestEntries().map((entry) => entry.nameKey));
    for (const key of Object.keys(partStrings)) {
      expect(used, `fa.json names "${key}", which no row uses`).toContain(key);
    }
  });

  it("orders rows by the chapter that checks them in", () => {
    const chapters = manifestEntries().map((entry) => entry.chapter);
    expect(chapters).toEqual([...chapters].sort((a, b) => a - b));
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
