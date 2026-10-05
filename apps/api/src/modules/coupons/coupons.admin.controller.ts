import type { Request, Response } from "express";
import * as couponsAdminService from "./coupons.admin.service.js";
import type {
  AdminCouponIdParam,
  AdminCouponListQuery,
  CreateCouponInput,
  UpdateCouponInput,
} from "./coupons.admin.schema.js";

export async function listAdminCouponsHandler(req: Request, res: Response): Promise<void> {
  const { type, active, code, ...pagination } = req.validatedQuery as AdminCouponListQuery;
  const { data, meta } = await couponsAdminService.listAdminCoupons(pagination, {
    type,
    active,
    code,
  });
  res.json({ ok: true, data, meta });
}

export async function getAdminCouponHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as AdminCouponIdParam;
  const data = await couponsAdminService.getAdminCouponById(id);
  res.json({ ok: true, data });
}

export async function createCouponHandler(req: Request, res: Response): Promise<void> {
  const data = await couponsAdminService.createCoupon(req.body as CreateCouponInput);
  res.status(201).json({ ok: true, data });
}

export async function updateCouponHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as AdminCouponIdParam;
  const data = await couponsAdminService.updateCoupon(id, req.body as UpdateCouponInput);
  res.json({ ok: true, data });
}

export async function deactivateCouponHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as AdminCouponIdParam;
  const data = await couponsAdminService.deactivateCoupon(id);
  res.json({ ok: true, data });
}
