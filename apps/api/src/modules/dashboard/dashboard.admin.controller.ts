import type { NextFunction, Request, Response } from "express";
import * as dashboardAdminService from "./dashboard.admin.service.js";
import type { AdminDashboardQuery } from "./dashboard.admin.schema.js";

export async function getAdminDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { range } = req.validatedQuery as AdminDashboardQuery;
    const data = await dashboardAdminService.getAdminDashboard(range);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
