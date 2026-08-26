import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * The connection URL lives here rather than in `schema.prisma` because Prisma 7
 * removed `datasource.url`: Migrate and Studio read it from this file, and the
 * client itself takes a driver adapter instead of a URL string
 * (https://pris.ly/d/config-datasource).
 *
 * `DATABASE_URL` comes from `apps/api/.env`, which is git-ignored — the same
 * place `MONGODB_URI` lives while both databases coexist through phase 2.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
