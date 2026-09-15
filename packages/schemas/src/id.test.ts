import { describe, expect, it } from "vitest";
import { idSchema } from "./id.js";
import { isUuid } from "./vehicleKeyCore.js";

/**
 * P15.S8b: `vehicleKeyCore.ts`'s `isUuid` replaces `idSchema.safeParse()`
 * for the browser's Garage widgets, specifically so that path never touches
 * zod. This file is the actual proof the two agree, over a corpus, rather
 * than an assertion in a comment -- if they ever disagree, the regex is
 * wrong, not the corpus.
 */
const CORPUS: ReadonlyArray<[label: string, value: string]> = [
  ["v1", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
  ["v4", "110ec58a-a0f2-4ac4-8393-c866d813b8d1"],
  ["v7 (this project's real ids)", "01a04993-304b-711b-bc3b-07984d11e822"],
  ["nil UUID", "00000000-0000-0000-0000-000000000000"],
  ["uppercase", "6BA7B810-9DAD-11D1-80B4-00C04FD430C8"],
  ["mixed case", "6ba7B810-9DAd-11d1-80B4-00c04FD430c8"],
  ["wrong length (short)", "6ba7b810-9dad-11d1-80b4-00c04fd430c"],
  ["wrong length (long)", "6ba7b810-9dad-11d1-80b4-00c04fd430c8a"],
  ["wrong separators", "6ba7b810_9dad_11d1_80b4_00c04fd430c8"],
  ["no separators", "6ba7b8109dad11d180b400c04fd430c8"],
  ["non-hex characters", "6ba7b810-9dad-11d1-80b4-00c04fzz30c8"],
  ["empty string", ""],
  ["whitespace only", "   "],
  ["a plain word", "not-a-uuid"],
  ["a UUID with surrounding whitespace", " 6ba7b810-9dad-11d1-80b4-00c04fd430c8 "],
  ["a UUID with a trailing newline", "6ba7b810-9dad-11d1-80b4-00c04fd430c8\n"],
  ["braces around a real UUID", "{6ba7b810-9dad-11d1-80b4-00c04fd430c8}"],
];

describe("isUuid matches idSchema exactly", () => {
  it.each(CORPUS)("agrees with zod's idSchema for: %s", (_label, value) => {
    const zodResult = idSchema.safeParse(value).success;
    expect(isUuid(value)).toBe(zodResult);
  });
});
