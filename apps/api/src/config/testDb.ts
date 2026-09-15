import { Prisma } from "@prisma/client";
import { prisma, resolveDatabaseUrl } from "./prisma.js";

/**
 * Test isolation, PostgreSQL edition.
 *
 * Under Mongo each test file connected to its own throwaway *database*
 * (`testDbUri("parsian-store-test-geo-routes")`) and dropped it afterwards.
 * That does not port: a Postgres database is not a cheap namespace, and every
 * one of them would need the full migration applied before a single assertion
 * could run -- 32 tables, sixty-odd times, per suite run.
 *
 * So the suite shares one migrated database and truncates between files
 * instead. `vitest.config.ts` sets `fileParallelism: false` to make that safe:
 * with a shared database, two files running at once would see each other's
 * rows. Truncation is one statement over all tables and costs microseconds,
 * where a migrate-per-file would cost seconds.
 */

/** Quoted table names straight from Prisma's metadata, so a renamed or newly
 * added model is covered without anyone remembering to update a list here. */
const TABLES: readonly string[] = Prisma.dmmf.datamodel.models.map(
  (model) => `"${model.dbName ?? model.name}"`,
);

/** The database component of a PostgreSQL connection URL. Percent-decoded
 * because a URL's pathname is still encoded, and the name is compared against
 * a literal suffix below. */
function databaseNameOf(connectionUrl: string): string {
  return decodeURIComponent(new URL(connectionUrl).pathname.replace(/^\//, ""));
}

/**
 * The database the client below is actually connected to.
 *
 * `config/prisma.ts` builds its adapter as `new PrismaPg(resolveDatabaseUrl())`
 * at import time, so calling that same function here yields the very string the
 * connection was opened with. That is deliberate, and it is the whole design of
 * this rail: `DATABASE_URL` and `TEST_DATABASE_URL` are *inputs* to that
 * decision, not the decision, and a guard that reads an input rather than the
 * outcome can be walked around by whichever input it did not read -- which is
 * exactly how the old check failed (see `testDbSetup.ts`).
 *
 * Resolved once at module scope rather than per call. `resolveDatabaseUrl()` is
 * a pure function of `env`, which is parsed once at import, so a later call
 * could not return anything different; and `resetDb()` runs between every one
 * of the api suite's 58 test files, where a `SELECT current_database()` round
 * trip per call would buy nothing that this does not already say.
 */
const TARGET_DATABASE = databaseNameOf(resolveDatabaseUrl());

/**
 * The rail, at the point of damage.
 *
 * There has always been a `_test` name check, but it lived in `testDbSetup.ts`
 * -- a *sibling* file that runs as vitest `globalSetup`. Two things were wrong
 * with that. It was skipped outright whenever `TEST_DATABASE_URL` was set, so
 * an environment variable could switch the rail off and point the TRUNCATE at
 * the development database, which it would then empty without a word. And any
 * path that reaches `resetDb()` without `globalSetup` having run -- a one-off
 * script, a `vitest` invocation from somewhere else, a future harness -- was
 * unguarded by construction, because the check was not on the code that does
 * the destroying.
 *
 * So the assertion is here, on the statement itself, and it has no escape
 * hatch: not an env var, not a flag, not a NODE_ENV. Anything that needs to
 * empty a database it cannot name with a `_test` suffix is doing something this
 * function is not for. The cost of the rule is a naming convention; the cost of
 * not having it was a developer's seeded catalogue.
 */
function assertTruncatable(databaseName: string): void {
  if (databaseName.endsWith("_test")) return;
  throw new Error(
    `resetDb() refused to TRUNCATE every table in "${databaseName}": it will only ` +
      `empty a database whose name ends in "_test", and this one does not. Nothing ` +
      `was deleted. The connection comes from resolveDatabaseUrl() in ` +
      `config/prisma.ts, which returns TEST_DATABASE_URL verbatim when that is set ` +
      `-- so check it first; otherwise DATABASE_URL is missing its _test suffix, or ` +
      `NODE_ENV is not "test".`,
  );
}

/**
 * Empties every table.
 *
 * `CASCADE` is required rather than merely convenient: the tables are a
 * foreign-key graph, and truncating them one at a time in any order hits a
 * constraint. `RESTART IDENTITY` matters for the few sequence-backed columns
 * (order numbers), so a test asserting on the first generated value does not
 * depend on how many tests ran before it.
 *
 * The guard runs before the statement, never after and never alongside it: a
 * refusal has to mean that nothing was deleted.
 */
export async function resetDb(): Promise<void> {
  assertTruncatable(TARGET_DATABASE);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

export { prisma };
export { connectDB, disconnectDB } from "./prisma.js";

/**
 * Boots the Express app on an ephemeral port for a route-level test.
 *
 * Sixty-odd suites repeated this same twelve-line `listen(0)` / read the
 * address / build a base URL dance, each with its own copy of the "the address
 * can be a string or null" narrowing. One copy, one place to fix.
 */
export async function startTestServer(): Promise<{ baseUrl: string; close: () => void }> {
  const { app } = await import("../app.js");
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => server.close(),
  };
}
