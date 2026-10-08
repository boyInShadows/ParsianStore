import type { Request, Response } from "express";
import * as auditAdminService from "./audit.admin.service.js";
import type { AdminAuditListQuery } from "./audit.admin.schema.js";

export async function listAdminAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const { page, limit, sort, ...filters } = req.validatedQuery as AdminAuditListQuery;
  const { data, meta } = await auditAdminService.listAdminAuditLogs({ page, limit, sort }, filters);
  res.json({ ok: true, data, meta });
}
