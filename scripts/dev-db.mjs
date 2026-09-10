import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 5433;

/**
 * Make sure something is answering on the development database port, then get
 * out of the way.
 *
 * This replaced a bare `docker compose up -d --wait postgres` as `predev`. That
 * command is right for a fresh clone and wrong for every machine where Postgres
 * is already running some other way: it fails hard when the Docker daemon is not
 * up, and `pnpm dev` refuses to start over a database that was never missing.
 *
 * The order here is "is it already there?" first, "start the container" second,
 * because the answer on a working machine is almost always the first one.
 */

/** The port `apps/api/.env` actually points at, so this cannot drift from it. */
async function resolvePort() {
  try {
    const env = await readFile(path.join(ROOT, "apps/api/.env"), "utf8");
    const uri = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
    const port = uri ? Number(new URL(uri.replace(/^postgres(ql)?:/, "http:")).port) : NaN;
    return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net
      .connect({ host: "127.0.0.1", port })
      .setTimeout(1_000)
      .on("connect", () => {
        socket.destroy();
        resolve(true);
      })
      .on("timeout", () => {
        socket.destroy();
        resolve(false);
      })
      .on("error", () => resolve(false));
  });
}

async function main() {
  const port = await resolvePort();

  if (await isListening(port)) {
    console.log(`db: already listening on 127.0.0.1:${port} — leaving it alone.`);
    return;
  }

  console.log(`db: nothing on 127.0.0.1:${port}, trying the compose service…`);
  try {
    await run("docker", ["compose", "up", "-d", "--wait", "postgres"], { cwd: ROOT });
    console.log("db: compose service is up.");
    return;
  } catch (error) {
    // Deliberately not fatal. The API prints its own connection error, which
    // names the URI it tried -- far more useful than this script guessing.
    // Exiting non-zero here would only stop `pnpm dev` from ever reaching it.
    const detail = String(error?.stderr || error?.message || error)
      .trim()
      .split("\n")[0];
    console.warn(
      `db: could not start the compose service — ${detail}\n` +
        `db: continuing anyway. If the API cannot connect, bring up any PostgreSQL 18 on ` +
        `127.0.0.1:${port}\n` +
        `db: and run "pnpm --filter api db:deploy" against it.`,
    );
  }
}

await main();
