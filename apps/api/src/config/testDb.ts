import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

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

/**
 * Empties every table.
 *
 * `CASCADE` is required rather than merely convenient: the tables are a
 * foreign-key graph, and truncating them one at a time in any order hits a
 * constraint. `RESTART IDENTITY` matters for the few sequence-backed columns
 * (order numbers), so a test asserting on the first generated value does not
 * depend on how many tests ran before it.
 */
export async function resetDb(): Promise<void> {
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
