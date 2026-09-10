import { Prisma } from "@prisma/client";
import type { AdminAuditLogDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import {
  paginate,
  type PaginatableDelegate,
  type PaginationMeta,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import type { AdminAuditListQuery } from "./audit.admin.schema.js";

type ListFilters = Omit<AdminAuditListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): Where {
  const where: Where = {};
  if (filters.entity) where.entity = filters.entity;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.actorId) where.actorId = filters.actorId;
  // `action` is stored as "<METHOD> <path>", so a method filter is a prefix
  // match anchored at the start. `startsWith` says that directly, where the
  // Mongo version built a `^…` regex and relied on the value coming from a
  // closed enum to be sure no metacharacter could reach it.
  if (filters.method) where.action = { startsWith: `${filters.method} ` };

  if (filters.from || filters.to) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.from) createdAt.gte = new Date(filters.from);
    if (filters.to) createdAt.lte = new Date(filters.to);
    where.createdAt = createdAt;
  }
  return where;
}

/**
 * "<METHOD> <path>" is what the middleware writes. Split rather than
 * re-parsed in the UI: an action string that somehow lacks a space still
 * has to render, so the whole value falls back to the path with an empty
 * method instead of producing `undefined`.
 */
function splitAction(action: string): { method: string; path: string } {
  const spaceAt = action.indexOf(" ");
  if (spaceAt === -1) return { method: "", path: action };
  return { method: action.slice(0, spaceAt), path: action.slice(spaceAt + 1) };
}

/**
 * The actor, joined rather than looked up per page.
 *
 * `deletedAt` is selected because the soft-delete extension does not reach
 * nested reads, and here the old behaviour is the one worth keeping: a staff
 * account removed after the fact reads as an unnamed actor, while its entries
 * stay in the trail. An audit log that hides what a since-removed admin did
 * defeats its own purpose.
 */
const ACTOR = {
  actor: { select: { name: true, phone: true, role: true, deletedAt: true } },
} as const;

type AuditRow = Prisma.AuditLogGetPayload<{ include: typeof ACTOR }>;

export async function listAdminAuditLogs(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminAuditLogDto[]; meta: PaginationMeta }> {
  const { data, meta } = await paginate<AuditRow>(
    prisma.auditLog as unknown as PaginatableDelegate<AuditRow>,
    "AuditLog",
    buildListFilter(filters),
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { include: ACTOR },
  );

  return {
    data: data.map((row) => {
      const actor = row.actor.deletedAt === null ? row.actor : null;
      const { method, path } = splitAction(row.action);
      return {
        id: row.id,
        actorId: row.actorId,
        // null, not omitted: a staff account deleted after the fact must
        // still show its entries rather than vanish from the trail.
        actorName: actor?.name ?? null,
        actorPhone: actor?.phone ?? null,
        actorRole: actor?.role ?? null,
        method,
        path,
        entity: row.entity,
        ...(row.entityId ? { entityId: row.entityId } : {}),
        ...(row.ip ? { ip: row.ip } : {}),
        ...(row.before === null ? {} : { before: row.before }),
        ...(row.after === null ? {} : { after: row.after }),
        createdAt: row.createdAt.toISOString(),
      };
    }),
    meta,
  };
}
