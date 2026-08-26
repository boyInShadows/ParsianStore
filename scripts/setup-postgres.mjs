import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create the project's PostgreSQL role and database, once, on a fresh machine.
 *
 * Run it as a PostgreSQL superuser:
 *
 *   pnpm db:setup
 *
 * It will prompt for the *superuser* password in your terminal. That password
 * is never read, stored or logged by this script — `psql` asks for it directly.
 * What the script supplies is the application role's password, which it reads
 * from `apps/api/.env`'s `DATABASE_URL` and passes to `psql` as a bound
 * variable rather than interpolating it into a SQL string, so it cannot end up
 * in shell history or a query log.
 *
 * Idempotent: re-running it on an existing role and database changes nothing
 * except resetting the role's password to whatever `.env` currently says, which
 * is also how you rotate it.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, "apps/api/.env");

/** Where a Windows PostgreSQL install puts psql, newest first. */
function findPsql() {
  if (process.env.PSQL) return process.env.PSQL;
  const roots = ["C:/Program Files/PostgreSQL", "D:/PostgreSQL"];
  const found = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const version of [20, 19, 18, 17, 16, 15]) {
      const candidate = path.join(root, String(version), "bin/psql.exe");
      if (existsSync(candidate)) found.push(candidate);
    }
  }
  // Fall back to whatever is on PATH -- Linux, macOS, or a custom install.
  return found[0] ?? "psql";
}

function readDatabaseUrl() {
  if (!existsSync(ENV_FILE)) {
    throw new Error(
      `No ${path.relative(ROOT, ENV_FILE)}. Copy the DATABASE_URL line into it first.`,
    );
  }
  const line = /^DATABASE_URL=(.+)$/m.exec(readFileSync(ENV_FILE, "utf8"));
  if (!line) {
    throw new Error(`No DATABASE_URL in ${path.relative(ROOT, ENV_FILE)}.`);
  }
  const url = new URL(line[1].trim());
  return {
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    host: url.hostname,
    port: url.port || "5432",
  };
}

/**
 * `CREATE ROLE`/`CREATE DATABASE` cannot take a bound parameter for the object
 * name, and `CREATE DATABASE` cannot run inside a transaction or a DO block --
 * so the role goes through a DO block (which can bind the password) and the
 * database through a guarded `\gexec`, which is the standard way to make it
 * conditional without a transaction.
 */
const SQL = `
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = :'role') THEN
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'role', :'password');
    RAISE NOTICE 'role % already existed; password reset', :'role';
  ELSE
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'role', :'password');
    RAISE NOTICE 'role % created', :'role';
  END IF;
END
$$;

SELECT format('CREATE DATABASE %I OWNER %I', :'database', :'role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'database')
\\gexec

-- uuid v7 lives in pgcrypto from PostgreSQL 18; on 17 and below Prisma
-- generates the value in the client instead, so a missing extension is not
-- fatal here.
\\connect :"database"
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO :"role";
`;

function main() {
  const target = readDatabaseUrl();
  const psql = findPsql();
  const superuser = process.env.PGSUPERUSER ?? "postgres";

  console.log(`psql:      ${psql}`);
  console.log(`server:    ${target.host}:${target.port}`);
  console.log(`creating:  role "${target.user}", database "${target.database}"`);
  console.log(`as:        ${superuser} (you will be asked for its password)\n`);

  execFileSync(
    psql,
    [
      "-U",
      superuser,
      "-h",
      target.host,
      "-p",
      target.port,
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      `role=${target.user}`,
      "-v",
      `password=${target.password}`,
      "-v",
      `database=${target.database}`,
      "-f",
      "-",
    ],
    { input: SQL, stdio: ["pipe", "inherit", "inherit"] },
  );

  console.log(`\ndone. Next: pnpm --filter api exec prisma migrate dev --name init`);
}

try {
  main();
} catch (error) {
  console.error(`\nsetup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
