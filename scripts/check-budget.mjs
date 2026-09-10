#!/usr/bin/env node
/**
 * Route JS budget gate (P15.S0).
 *
 * WHY THIS EXISTS. Until this file, the budget was a row in a markdown table
 * (`masterPlan.md` §10) and nothing could fail on it. That is the entire reason
 * P11.S2's +8 KB survived a whole phase undetected, and why the landing drifted
 * 189 → 200 KB across four phases with every step believing it had held the
 * line. **A budget that is not a failing check is not a budget.**
 *
 * WHY IT READS `.next` RATHER THAN SCRAPING THE BUILD LOG. Next prints the
 * route table once, to stdout, and it is trivially lost -- to `tail`, to turbo's
 * prefixing, to a CI log limit. The same numbers are recoverable from the build
 * output on disk, which survives, can be re-checked without a rebuild, and lets
 * this script attribute a breach to individual chunks instead of only reporting
 * a total.
 *
 * HOW THE NUMBER IS COMPUTED. "First Load JS" for a route is the gzipped size of
 * every script the browser needs before that route is interactive: the route's
 * own chunks plus the shared chunks every page loads. `app-build-manifest.json`
 * lists exactly that set per entry, already deduplicated by Next. We gzip each
 * file and sum.
 *
 * These figures were checked against Next's own printed table at the commit that
 * introduced this file, and agree to within 0.1 kB: cart 150.9 vs 151, checkout
 * 164.9 vs 165, styleguide 148.1 vs 148, framework floor 102.9 vs 103. That
 * cross-check is how the two double-counting bugs in the first version were
 * caught -- both printed a confident, plausible, wrong total rather than an
 * error. **If you change how the size is computed, re-run a build and compare
 * against its table again.** A gate that disagrees with the build teaches the
 * team to ignore it.
 *
 * MEASURE, DO NOT ESTIMATE: every number below is read off a real build.
 */

import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import process from "node:process";

const WEB_ROOT = path.resolve(import.meta.dirname, "..", "apps", "web");
const NEXT_DIR = path.join(WEB_ROOT, ".next");

/**
 * The budgets, and the reasoning that sets each one (P15.S1).
 *
 * `firstLoad` is the whole cost of arriving on the route. `ownChunks` is that
 * minus everything shared with every other page -- the part this repo actually
 * controls. Both are needed: roughly 100 KB of the landing's total is Next's App
 * Router runtime plus react-dom, which cannot be recovered without leaving the
 * framework, so a total alone can never say *who* grew. The sub-budget can, and
 * it is the one that would have failed in P11.S2's own commit.
 *
 * WHY 200 AND NOT MORE. The owner authorised a raise and asked for it to stay as
 * low as it can ("don't open it for like 600kb"). The landing measures 200 KB
 * today, so 200 is not headroom -- it is "no further growth", with `warnAt`
 * making recovery the default direction. ~1 ms of parse+compile per KB on a
 * mid-tier phone is the reason the ceiling matters: this shop's customer is on a
 * mid-tier Android over an Iranian mobile network, not a laptop.
 */
const BUDGETS = {
  "/[locale]/(shop)": {
    label: "landing",
    firstLoad: 200,
    warnAt: 190,
    ownChunks: 82,
    why: "P15.S1. Raised from the long-breached 180 with owner sign-off; 199.7 is the measured value, so 200 is a freeze, not headroom.",
  },
  // PLP and PDP keep the §10 numbers they have always had. Both measure well
  // under them (155.0 and 161.0 on 2026-09-08), so there is nothing to raise --
  // and raising a budget a route already meets is precisely the drift this gate
  // exists to stop. The first draft of this file quietly loosened both to 180 to
  // match the landing's bucket; that is recorded here because it is the exact
  // mistake the phase was opened to prevent, made while writing the prevention.
  "/[locale]/(shop)/c/[slug]": {
    label: "PLP (category)",
    firstLoad: 160,
    warnAt: 157,
    ownChunks: 38,
    why: "masterPlan.md §10, unchanged. Measures 155.0 / 35.1.",
  },
  "/[locale]/(shop)/brand/[slug]": {
    label: "PLP (brand)",
    firstLoad: 160,
    warnAt: 157,
    ownChunks: 38,
    why: "masterPlan.md §10, PLP row. Measures 155.0 / 35.1.",
  },
  "/[locale]/(shop)/p/[slug]": {
    label: "PDP",
    firstLoad: 170,
    warnAt: 165,
    ownChunks: 44,
    why: "masterPlan.md §10, unchanged. Measures 161.0 / 41.1.",
  },
  "*": {
    label: "other shop routes",
    firstLoad: 180,
    warnAt: 175,
    ownChunks: 48,
    why: "masterPlan.md §10, unchanged. Every other shop route retains real margin against it; checkout at 45.0 kB own is the closest.",
  },
};

/**
 * Two shared layers, not one -- and separating them is what makes a breach
 * attributable (P15.S0).
 *
 * `SHARED_BUDGET_KB` is the framework floor: webpack runtime, react-dom, the App
 * Router client runtime, main-app. 102.9 kB measured, and **not recoverable from
 * any route without leaving Next's App Router** -- recorded as a boundary so
 * nobody spends a step chasing it.
 *
 * `GROUP_SHARED_BUDGET_KB` is the shop chrome every one of the 23 shop routes
 * pays for: 17.0 kB, measured as the intersection of all shop page entries. This
 * one IS ours, and it is the layer P11.S2's `tailwind-merge` regression landed
 * in -- a header component gaining a dependency taxes twenty-three routes at
 * once, which is exactly the failure a per-route total is blind to.
 */
const SHARED_BUDGET_KB = 105;
const GROUP_SHARED_BUDGET_KB = 20;

/**
 * Admin is an internal tool, not a customer-facing route, and has never had a
 * §10 budget (masterPlan §13, P8.S1). Excluded explicitly rather than by a
 * silent absence, so the exclusion is a decision a reader can find and argue
 * with rather than a gap that looks like an oversight.
 */
const UNBUDGETED = [/\(admin\)/];

const KB = 1000; // Next reports kB as 1000 bytes, not 1024. Match it or the comparison lies.

/** Gzipped byte size of one file, streamed -- some chunks are megabytes uncompressed. */
async function gzipSize(filePath) {
  let total = 0;
  const counter = new (await import("node:stream")).Writable({
    write(chunk, _enc, cb) {
      total += chunk.length;
      cb();
    },
  });
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), counter);
  return total;
}

async function sizeOfChunks(files) {
  let total = 0;
  for (const file of files) {
    const abs = path.join(NEXT_DIR, file);
    try {
      await stat(abs);
    } catch {
      // A manifest entry with no file on disk means the build is stale or partial.
      // Failing loudly beats reporting a small, wrong number.
      throw new Error(
        `Manifest references a chunk that is not on disk: ${file}\n` +
          `The build in apps/web/.next is stale or incomplete. Run: rm -rf apps/web/.next && pnpm build`,
      );
    }
    total += await gzipSize(abs);
  }
  return total;
}

function budgetFor(route) {
  return BUDGETS[route] ?? BUDGETS["*"];
}

function isUnbudgeted(route) {
  return UNBUDGETED.some((re) => re.test(route));
}

/** `/[locale]/page` -> `/[locale]`; `/[locale]/cart/page` -> `/[locale]/cart`. */
function routeOf(entry) {
  return entry.replace(/\/page$/, "").replace(/\/route$/, "") || "/";
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const jsonOut = args.has("--json");

  let manifest;
  let buildManifest;
  try {
    manifest = JSON.parse(await readFile(path.join(NEXT_DIR, "app-build-manifest.json"), "utf8"));
    buildManifest = JSON.parse(await readFile(path.join(NEXT_DIR, "build-manifest.json"), "utf8"));
  } catch {
    console.error(
      "No build found at apps/web/.next/app-build-manifest.json.\n" +
        "Run `pnpm build` first. This gate reads a real build; it never estimates.",
    );
    process.exit(2);
  }

  // A page's manifest entry ALREADY contains the shared root chunks -- verified
  // against Next's own printed table, which is the only way to know: gzipping
  // exactly `pages["/[locale]/(shop)/cart/page"]` reproduces Next's 151 kB to
  // within 0.1 kB. The first version of this file also unioned in the locale
  // layout's entry, which double-counted one chunk and put every route ~15 kB
  // over -- a gate that disagrees with the build is worse than no gate, because
  // it teaches the team to ignore it.
  const shared = new Set(buildManifest.rootMainFiles ?? []);
  const sharedKb = (await sizeOfChunks([...shared])) / KB;

  const budgeted = Object.entries(manifest.pages).filter(
    ([entry]) => entry.endsWith("/page") && !isUnbudgeted(routeOf(entry)),
  );

  // The shop chrome, derived rather than declared: the chunks common to EVERY
  // budgeted route. Taking the `(shop)/layout` manifest entry instead would
  // overstate it -- Next lists chunks there that it then splits away from routes
  // which do not use them (`/contact` loads 120.2 kB total, well under
  // root+layout), so the intersection is the only set that is genuinely paid by
  // all of them.
  // Only the `(shop)` group: `/_not-found` is budgeted but sits outside the shop
  // layout and shares none of its chrome, so including it collapsed the
  // intersection to empty and silently reported a 0.0 kB chrome layer -- a gate
  // reporting zero for something that measures 17 kB is worse than one that
  // reports nothing at all.
  let intersection = null;
  for (const [entry, files] of budgeted) {
    if (!entry.includes("(shop)")) continue;
    const set = new Set(files);
    intersection =
      intersection === null ? set : new Set([...intersection].filter((f) => set.has(f)));
  }
  const groupShared = [...(intersection ?? [])].filter((f) => !shared.has(f));
  const groupSharedKb = (await sizeOfChunks(groupShared)) / KB;

  const notOwn = new Set([...shared, ...groupShared]);

  const rows = [];
  for (const [entry, files] of budgeted) {
    rows.push({
      route: routeOf(entry),
      firstLoadKb: (await sizeOfChunks(files)) / KB,
      ownKb: (await sizeOfChunks(files.filter((f) => !notOwn.has(f)))) / KB,
    });
  }

  rows.sort((a, b) => b.firstLoadKb - a.firstLoadKb);

  const failures = [];
  const warnings = [];

  if (sharedKb > SHARED_BUDGET_KB) {
    failures.push(
      `framework floor  ${sharedKb.toFixed(1)} kB  >  ${SHARED_BUDGET_KB} kB budget` +
        `\n    Every route pays this. Next's own runtime grew, or a dependency reached rootMainFiles.`,
    );
  }
  if (groupSharedKb > GROUP_SHARED_BUDGET_KB) {
    failures.push(
      `shop chrome  ${groupSharedKb.toFixed(1)} kB  >  ${GROUP_SHARED_BUDGET_KB} kB budget` +
        `\n    Paid by all ${rows.length} shop routes. Something in the header, footer or providers` +
        `\n    gained a dependency -- this is the layer P11.S2's +8 KB landed in.`,
    );
  }

  for (const row of rows) {
    const b = budgetFor(row.route);
    if (row.firstLoadKb > b.firstLoad) {
      failures.push(
        `${row.route}  first load  ${row.firstLoadKb.toFixed(1)} kB  >  ${b.firstLoad} kB (${b.label})` +
          `\n    ${b.why}`,
      );
    } else if (row.firstLoadKb > b.warnAt) {
      warnings.push(
        `${row.route}  first load  ${row.firstLoadKb.toFixed(1)} kB  >  ${b.warnAt} kB warn line (hard fail at ${b.firstLoad})`,
      );
    }
    if (row.ownKb > b.ownChunks) {
      failures.push(
        `${row.route}  own chunks  ${row.ownKb.toFixed(1)} kB  >  ${b.ownChunks} kB (${b.label})` +
          `\n    This is the route's own code, not the framework floor -- it is the number this repo controls.`,
      );
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify({ sharedKb, rows, failures, warnings }, null, 2));
  } else {
    const pad = Math.max(...rows.map((r) => r.route.length));
    console.log(`\n  Route JS budgets -- measured from apps/web/.next, gzip level 9\n`);
    console.log(`  ${"route".padEnd(pad)}   first load    own`);
    for (const row of rows) {
      const b = budgetFor(row.route);
      const over = row.firstLoadKb > b.firstLoad || row.ownKb > b.ownChunks;
      const warn = !over && row.firstLoadKb > b.warnAt;
      const mark = over ? "FAIL" : warn ? "warn" : "    ";
      console.log(
        `  ${row.route.padEnd(pad)}  ${row.firstLoadKb.toFixed(1).padStart(7)} kB  ${row.ownKb
          .toFixed(1)
          .padStart(6)} kB  ${mark}`,
      );
    }
    console.log(
      `\n  framework floor ${sharedKb.toFixed(1)} kB (budget ${SHARED_BUDGET_KB})   ` +
        `shop chrome ${groupSharedKb.toFixed(1)} kB (budget ${GROUP_SHARED_BUDGET_KB})   ` +
        `-- both included in every first-load figure above\n`,
    );

    for (const w of warnings) console.log(`  WARN  ${w}`);
    for (const f of failures) console.log(`  FAIL  ${f}`);
    console.log("");
  }

  if (failures.length > 0) {
    console.error(
      `Budget gate failed: ${failures.length} breach${failures.length === 1 ? "" : "es"}.\n` +
        `Do not raise a budget to make this pass. Either recover the bytes, or take the raise\n` +
        `to the owner with the measurement that justifies it -- that is the process this gate exists to enforce.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(2);
});
