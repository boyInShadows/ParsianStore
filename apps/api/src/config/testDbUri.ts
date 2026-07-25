import { env } from "./env.js";

// Reuses whatever MONGODB_URI is already configured (a developer's real
// local .env, or env.ts's unauthenticated-localhost default that CI's
// mongo:7 service matches) but swaps in a dedicated database name, so
// tests never write into the same database as `pnpm dev`.
export function testDbUri(dbName: string): string {
  const url = new URL(env.MONGODB_URI);
  url.pathname = `/${dbName}`;
  return url.toString();
}
