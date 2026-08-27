import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { logger } from "./logger.js";

/**
 * The single PostgreSQL client for the whole API.
 *
 * Prisma 7 does not take a connection URL: the client is handed a *driver
 * adapter* built over a real `pg` pool, and Migrate/Studio read the URL from
 * `prisma.config.ts` instead (https://pris.ly/d/config-datasource).
 */

/**
 * Every model in `schema.prisma` that carries a `deletedAt` column, derived
 * from Prisma's own runtime metadata rather than hand-listed. A hand-written
 * list is a second source of truth that silently rots the moment somebody adds
 * `deletedAt` to a new model and forgets this file -- and the failure mode of
 * *missing* a model here is soft-deleted rows quietly reappearing in results,
 * which no test asserts against because no query mentions the filter.
 */
const SOFT_DELETABLE: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === "deletedAt"))
    .map((model) => model.name),
);

/**
 * Read/write operations that must not see soft-deleted rows.
 *
 * `create`/`createMany` are absent because they have no `where`. `upsert` is
 * absent deliberately: injecting the filter would make it miss an existing
 * soft-deleted row and attempt an insert, which then fails on the unique
 * constraint instead of doing something sensible. Callers that upsert over a
 * soft-deletable model decide for themselves what a tombstoned row means.
 */
const FILTERED_OPERATIONS: ReadonlySet<string> = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

type WhereArgs = { where?: Record<string, unknown> };

/**
 * Re-imposes Mongoose's soft-delete semantics, which the app depends on far
 * more than it looks like it does.
 *
 * The Mongoose plugin injected `deletedAt: null` in a `pre(/^(find|countDocuments)/)`
 * hook, so **every query in this codebase is written assuming that filter and
 * none of them say so**. Prisma has no such hook, and a missed filter does not
 * fail -- it silently resurrects deleted rows. Re-imposing it centrally here is
 * the only version of this that is safe to review: the alternative is trusting
 * twenty modules of hand-edits to each remember an invisible invariant.
 *
 * The escape hatch matches the old plugin's exactly: a caller who *names*
 * `deletedAt` in the filter (an admin "trash" view asking for `{ not: null }`)
 * is left alone.
 *
 * **Known limitation, inherited from Prisma, not from us:** query extensions do
 * not reach nested relation reads, so `include`/`select` of a soft-deletable
 * relation still needs its own explicit `where: { deletedAt: null }`. Mongoose's
 * `populate` did run the hook. Every such site in the app spells the filter out.
 */
function softDeleteExtension(client: PrismaClient) {
  return client.$extends({
    name: "softDelete",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!SOFT_DELETABLE.has(model) || !FILTERED_OPERATIONS.has(operation)) {
            return query(args);
          }
          const typed = args as WhereArgs;
          if (typed.where?.deletedAt !== undefined) return query(args);
          return query({ ...typed, where: { ...typed.where, deletedAt: null } });
        },
      },
    },
  });
}

function createClient() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to reach PostgreSQL");
  }
  const adapter = new PrismaPg(env.DATABASE_URL);
  return softDeleteExtension(new PrismaClient({ adapter }));
}

export type Db = ReturnType<typeof createClient>;

/**
 * Built once at import time so every module shares one connection pool. A
 * per-module client would open a pool each, which in a `tsx watch` loop
 * exhausts Postgres' connection slots within a few reloads.
 */
export const prisma: Db = createClient();

export async function connectDB(): Promise<Db> {
  await prisma.$connect();
  logger.info({ db: "postgres" }, "PostgreSQL connected");
  return prisma;
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Soft delete: mark-and-hide, so audit trails and order history survive a
 * "delete". The Mongoose equivalent was a document method (`doc.softDelete()`);
 * Prisma has no document objects, so it is a function over the model delegate.
 */
export function softDeleteData(): { deletedAt: Date } {
  return { deletedAt: new Date() };
}
