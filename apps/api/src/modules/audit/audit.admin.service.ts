import type { FilterQuery } from "mongoose";
import type { AdminAuditLogDto } from "schemas";
import { AuditLogModel, type AuditLog } from "../../models/AuditLog.js";
import { UserModel } from "../../models/User.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";
import type { AdminAuditListQuery } from "./audit.admin.schema.js";

type ListFilters = Omit<AdminAuditListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): FilterQuery<AuditLog> {
  const filter: FilterQuery<AuditLog> = {};
  if (filters.entity) filter.entity = filters.entity;
  if (filters.entityId) filter.entityId = filters.entityId;
  if (filters.actorId) filter.actorId = filters.actorId;
  // `action` is stored as "<METHOD> <path>", so a method filter is a
  // prefix match anchored at the start. The value comes from a closed
  // enum (audit.admin.schema.ts) and can carry no regex metacharacter.
  if (filters.method) filter.action = { $regex: `^${filters.method} ` };

  if (filters.from || filters.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (filters.from) createdAt.$gte = new Date(filters.from);
    if (filters.to) createdAt.$lte = new Date(filters.to);
    filter.createdAt = createdAt;
  }
  return filter;
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

export async function listAdminAuditLogs(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminAuditLogDto[]; meta: PaginationMeta }> {
  const { data, meta } = await paginate(AuditLogModel, buildListFilter(filters), {
    ...pagination,
    sort: pagination.sort ?? "-createdAt",
  });

  // One lookup for the whole page rather than a populate per row -- a page
  // of twenty writes by the same admin would otherwise fetch that user
  // twenty times.
  const actorIds = [...new Set(data.map((doc) => String(doc.actorId)))];
  const actors = await UserModel.find({ _id: { $in: actorIds } }).select("name phone role");
  const byId = new Map(actors.map((actor) => [String(actor._id), actor]));

  return {
    data: data.map((doc) => {
      const actor = byId.get(String(doc.actorId));
      const { method, path } = splitAction(doc.action);
      return {
        id: String(doc._id),
        actorId: String(doc.actorId),
        // null, not omitted: a staff account deleted after the fact must
        // still show its entries rather than vanish from the trail.
        actorName: actor?.name ?? null,
        actorPhone: actor?.phone ?? null,
        actorRole: actor?.role ?? null,
        method,
        path,
        entity: doc.entity,
        ...(doc.entityId ? { entityId: doc.entityId } : {}),
        ...(doc.ip ? { ip: doc.ip } : {}),
        ...(doc.before === undefined ? {} : { before: doc.before }),
        ...(doc.after === undefined ? {} : { after: doc.after }),
        createdAt: doc.createdAt.toISOString(),
      };
    }),
    meta,
  };
}
