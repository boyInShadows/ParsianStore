import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { resolveDatabaseUrl } from "./prisma.js";

/**
 * Vitest `globalSetup`: make sure the *test* database exists and is migrated,
 * once, before any suite connects.
 *
 * This is what replaces Mongo's `testDbUri`. Under Mongo a database sprang
 * into existence on first write and every suite dropped its own afterwards;
 * PostgreSQL needs the database created and the schema applied, and doing that
 * per file would mean applying 30-odd tables sixty times a run. So: one
 * database, created here if missing, migrated here, then truncated between
 * files by `resetDb()`.
 *
 * It is deliberately not the development database -- see `resolveDatabaseUrl`
 * for what went wrong when it was.
 */
export async function setup(): Promise<void> {
  const testUrl = new URL(resolveDatabaseUrl());
  const databaseName = decodeURIComponent(testUrl.pathname.replace(/^\//, ""));

  // A safety rail rather than politeness: everything downstream truncates
  // every table, so pointing this at the wrong database destroys real data.
  // The suite refuses to run rather than trusting the environment.
  //
  // This check used to read `!databaseName.endsWith("_test") &&
  // !env.TEST_DATABASE_URL` -- that is, setting `TEST_DATABASE_URL` skipped it
  // entirely, whatever it pointed at, including the development database.
  // A rail an environment variable can switch off is not a rail. The variable
  // still does its real job of *choosing the connection* (another host, port,
  // or credential for a CI service that provides the database); it no longer
  // excuses the name.
  //
  // The same rule now lives in `resetDb()` itself, where the TRUNCATE actually
  // happens (P15.S13), and the two deliberately agree rather than one being
  // laxer. A laxer check here would not permit anything extra -- `resetDb()`
  // would refuse anyway -- it would only trade one clear refusal at startup for
  // 58 confusing mid-suite failures. If a service ever genuinely cannot name
  // its database with a `_test` suffix, both places have to be loosened
  // together, and the one guarding the destructive statement is the one that
  // needs the argument.
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against "${databaseName}": the test database name must end in _test`,
    );
  }

  // Connect to the server's default database to ask about, and possibly
  // create, the one under test -- `CREATE DATABASE` cannot run from inside the
  // database it creates.
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    if (rowCount === 0) {
      // Identifiers cannot be bound as parameters; the name is quoted instead,
      // and it came from our own URL rather than from input.
      await admin.query(`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`);
    }
  } finally {
    await admin.end();
  }

  // `migrate deploy` rather than `db push`: the suite should run against the
  // same migrations production will, so a migration that is wrong fails here
  // rather than at deploy time.
  execFileSync(
    "node",
    [
      fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url)),
      "migrate",
      "deploy",
    ],
    {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: { ...process.env, DATABASE_URL: testUrl.toString() },
      stdio: "pipe",
    },
  );
}
