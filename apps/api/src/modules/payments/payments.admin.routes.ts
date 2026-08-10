import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { reconcilePayments } from "./payments.admin.service.js";

export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(requireAuth, requireStaff());
adminPaymentsRouter.get("/reconciliation", async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await reconcilePayments() });
  } catch (error) {
    next(error);
  }
});
