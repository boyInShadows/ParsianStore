import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cn } from "./cn.js";
import { cx } from "./cx.js";

/**
 * `cx()` is `cn()` without tailwind-merge, and tailwind-merge is 7 KB gzipped
 * on every route a Client Component drags it onto -- measured by stubbing the
 * merge and rebuilding, which took the landing route from 200 KB to 193 KB.
 *
 * Two things have to stay true for that trade to be honest, and each has a
 * test below.
 */

/**
 * Every composition that has moved to `cx()`, exactly as its component writes
 * it. The merge has to be a no-op on each -- these components compose only
 * their own strings, and the strings touch different utility groups.
 *
 * When one of these fails, the site has grown a genuinely conflicting utility
 * and `cx()` would now ship a class attribute whose winner is decided by
 * stylesheet order. Move that site back to `cn()`, or stop the conflict.
 */
const MIGRATED_SITES: ReadonlyArray<readonly [string, readonly unknown[]]> = [
  [
    "Drawer panel",
    [
      "fixed top-0 m-0 h-dvh w-full max-w-sm border-s border-border bg-surface p-0 text-text",
      "start-0 end-auto",
    ],
  ],
  [
    "Drawer panel (end)",
    [
      "fixed top-0 m-0 h-dvh w-full max-w-sm border-s border-border bg-surface p-0 text-text",
      "end-0 start-auto",
    ],
  ],
  [
    "Tabs trigger (selected)",
    [
      "border-b-2 px-4 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none",
      "border-brand-solid text-text",
    ],
  ],
  [
    "Tabs trigger (idle)",
    [
      "border-b-2 px-4 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none",
      "border-transparent text-text-muted hover:text-text",
    ],
  ],
  ...(["neutral", "success", "warning", "danger"] as const).map(
    (tone) =>
      [
        `Toast (${tone})`,
        [
          "pointer-events-auto rounded-md border px-4 py-2 text-body-sm shadow-md",
          {
            neutral: "border-border bg-surface text-text",
            success: "border-success bg-surface text-success",
            warning: "border-warning bg-surface text-warning",
            danger: "border-danger bg-surface text-danger",
          }[tone],
        ],
      ] as const,
  ),
];

describe("cx", () => {
  it.each(MIGRATED_SITES.map(([name, inputs]) => ({ name, inputs })))(
    "$name composes identically with and without the merge",
    ({ inputs }) => {
      expect(cx(...(inputs as never[]))).toBe(cn(...(inputs as never[])));
    },
  );

  it("joins conditionals the way clsx does", () => {
    const off = false as boolean;
    expect(cx("a", off && "b", ["c", { d: true, e: false }])).toBe("a c d");
  });

  // The difference between the two, stated as a test so the reason `cn()` still
  // exists is not just a comment: a caller's utility must beat the component's.
  it("does NOT resolve a conflict, which is exactly why cn() still exists", () => {
    expect(cn("bg-brand-solid", "bg-surface")).toBe("bg-surface");
    expect(cx("bg-brand-solid", "bg-surface")).toBe("bg-brand-solid bg-surface");
  });
});

/**
 * Client Components allowed to import `@/lib/cn`, each with the reason.
 * Importing it from a Client Component pulls tailwind-merge into that route's
 * browser bundle, so this list is the budget's only guard -- growing it is a
 * deliberate act with a measurable cost, not an import someone adds by habit.
 */
const CN_CLIENT_ALLOWLIST: Readonly<Record<string, string>> = {
  "components/primitives/SearchField.tsx":
    "takes a caller `className` on its input, so the merge is load-bearing: " +
    "without it the caller's utility loses to the base. Not on the landing " +
    "route's client graph -- removing it there saved nothing.",
};

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

describe("the client bundle's tailwind-merge budget", () => {
  it("keeps @/lib/cn out of Client Components except the allowlisted ones", async () => {
    const root = path.resolve(import.meta.dirname, "..");
    const files = [
      ...(await walk(path.join(root, "components"))),
      ...(await walk(path.join(root, "app"))),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (!/^\s*["']use client["']/m.test(source)) continue;
      if (!/from\s+["']@\/lib\/cn["']/.test(source)) continue;
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (!(rel in CN_CLIENT_ALLOWLIST)) offenders.push(rel);
    }

    expect(
      offenders,
      `These Client Components import @/lib/cn, which puts tailwind-merge (7 KB gz) ` +
        `into their route's browser bundle:\n  ${offenders.join("\n  ")}\n` +
        `If the component composes only its own classes, import { cx } from "@/lib/cx" ` +
        `and add the composition to MIGRATED_SITES above. If it merges a caller's ` +
        `className, the merge is required -- add it to CN_CLIENT_ALLOWLIST with the reason.`,
    ).toEqual([]);
  });

  it("lists nothing in the allowlist that has stopped importing cn", async () => {
    const root = path.resolve(import.meta.dirname, "..");
    for (const rel of Object.keys(CN_CLIENT_ALLOWLIST)) {
      const source = await readFile(path.join(root, rel), "utf8");
      expect(/from\s+["']@\/lib\/cn["']/.test(source), `${rel} no longer imports cn`).toBe(true);
    }
  });
});
