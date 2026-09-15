import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * P15.S13 -- proving the rail on `resetDb()`'s TRUNCATE.
 *
 * The code under test is destructive by definition, so the one thing this file
 * must not do is prove the guard by letting the statement run: a test that
 * truncates a real database to demonstrate that truncation is refused is the
 * incident it exists to prevent. So `./prisma.js` is mocked outright -- both
 * `resolveDatabaseUrl()`, which decides *which* database is in play, and the
 * client the statement would be issued to.
 *
 * That also makes the assertion sharper than "it threw". Each case asserts on
 * `$executeRawUnsafe` as well, because a guard that threw *after* issuing the
 * TRUNCATE would satisfy a rejects-check and still have emptied the database.
 * "It refused" and "nothing was deleted" are two different claims and the
 * second one is the one that matters.
 *
 * `vi.resetModules()` plus a dynamic import per case is not ceremony:
 * `testDb.ts` resolves its target database name once at module scope -- that is
 * the point of it, it costs nothing per call -- so a case that wants a
 * different database has to load the module again to get one.
 */

type FakeClient = { $executeRawUnsafe: ReturnType<typeof vi.fn> };

const DEV_URL = "postgresql://parsianstore:parsianstore@localhost:5433/parsian_store?schema=public";
const TEST_URL =
  "postgresql://parsianstore:parsianstore@localhost:5433/parsian_store_test?schema=public";

async function loadResetDb(
  databaseUrl: string,
): Promise<{ resetDb: () => Promise<void>; client: FakeClient }> {
  vi.resetModules();
  const client: FakeClient = { $executeRawUnsafe: vi.fn().mockResolvedValue(0) };
  vi.doMock("./prisma.js", () => ({
    prisma: client,
    resolveDatabaseUrl: () => databaseUrl,
    // `testDb.ts` re-exports these; a mock that omits them fails the re-export
    // rather than the assertion, which is a confusing way to learn that.
    connectDB: vi.fn(),
    disconnectDB: vi.fn(),
  }));
  const { resetDb } = await import("./testDb.js");
  return { resetDb, client };
}

afterEach(() => {
  vi.doUnmock("./prisma.js");
  vi.resetModules();
});

describe("resetDb's TRUNCATE guard", () => {
  it("refuses a database whose name does not end in _test, and issues no statement", async () => {
    const { resetDb, client } = await loadResetDb(DEV_URL);

    await expect(resetDb()).rejects.toThrow(/refused to TRUNCATE/);
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("names the database it refused, so the error says what was nearly destroyed", async () => {
    const { resetDb } = await loadResetDb(DEV_URL);

    await expect(resetDb()).rejects.toThrow(/"parsian_store"/);
  });

  it("truncates normally when the database is named with a _test suffix", async () => {
    const { resetDb, client } = await loadResetDb(TEST_URL);

    await expect(resetDb()).resolves.toBeUndefined();
    expect(client.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    const [statement] = client.$executeRawUnsafe.mock.calls[0] as [string];
    expect(statement).toMatch(/^TRUNCATE TABLE /);
    expect(statement).toContain("RESTART IDENTITY CASCADE");
  });

  /**
   * The regression itself. The old check read `!endsWith("_test") &&
   * !env.TEST_DATABASE_URL`, so setting that variable disabled it whatever it
   * pointed at -- aim it at the development database and the suite emptied it
   * without a word.
   *
   * This passes *by construction* now, because the guard reads the resolved
   * connection and cannot see the variable at all. That is the design, not an
   * accident, and asserting it is what makes re-introducing an env-shaped
   * escape hatch in `testDb.ts` fail a test rather than pass review.
   */
  it("still refuses when TEST_DATABASE_URL is set -- the variable is not an escape hatch", async () => {
    const previous = process.env.TEST_DATABASE_URL;
    process.env.TEST_DATABASE_URL = DEV_URL;
    try {
      const { resetDb, client } = await loadResetDb(DEV_URL);

      await expect(resetDb()).rejects.toThrow(/refused to TRUNCATE/);
      expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.TEST_DATABASE_URL;
      else process.env.TEST_DATABASE_URL = previous;
    }
  });

  it("requires the suffix, not merely the substring (parsian_store_testing is refused)", async () => {
    const { resetDb, client } = await loadResetDb(
      DEV_URL.replace("parsian_store", "store_testing"),
    );

    await expect(resetDb()).rejects.toThrow(/refused to TRUNCATE/);
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("reads the name from the URL path, not from the query string", async () => {
    // `?schema=public` is on every one of these URLs and contains no database
    // name; a guard that matched loosely against the whole string rather than
    // the pathname would be fooled by a URL like `.../dev?schema=x_test`.
    const { resetDb, client } = await loadResetDb(`${DEV_URL}&other=ignored_test`);

    await expect(resetDb()).rejects.toThrow(/"parsian_store"/);
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});

/**
 * `testDbSetup.ts` runs as vitest `globalSetup` -- a separate process phase
 * that no test in this file can call -- so its rule is pinned against the
 * source text instead, the same way `env.test.ts` pins the one `env.ts` default
 * whose value has behavioural consequences.
 *
 * The specific thing being kept out is the clause this step removed. It is
 * cheap to reintroduce (it looks like a courtesy to CI) and expensive to
 * discover, because the failure mode is a silently emptied database.
 */
describe("testDbSetup.ts source", () => {
  const source = readFileSync(fileURLToPath(new URL("./testDbSetup.ts", import.meta.url)), "utf8");

  it("does not let TEST_DATABASE_URL skip the _test name check", () => {
    const guard = source.slice(source.indexOf("if (!databaseName.endsWith"));
    expect(guard.startsWith('if (!databaseName.endsWith("_test")) {')).toBe(true);
  });
});
