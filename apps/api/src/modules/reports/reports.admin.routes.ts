import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validateParams } from "../../middleware/validate.js";
import { exportReport, reportSummary } from "./reports.admin.service.js";
export const adminReportsRouter = Router();
adminReportsRouter.use(requireAuth, requireStaff());
adminReportsRouter.get("/summary", async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await reportSummary() });
  } catch (error) {
    next(error);
  }
});
const paramsSchema = z.object({ kind: z.enum(["orders", "inventory", "customers"]) });
adminReportsRouter.get("/export/:kind", validateParams(paramsSchema), async (req, res, next) => {
  try {
    const kind = (req.params as { kind: "orders" | "inventory" | "customers" }).kind;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="parsian-${kind}.csv"`);
    res.send(await exportReport(kind));
  } catch (error) {
    next(error);
  }
});
