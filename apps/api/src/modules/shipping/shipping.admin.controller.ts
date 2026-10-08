import type { Request, Response } from "express";
import * as shippingAdminService from "./shipping.admin.service.js";
import type {
  AdminShippingRateListQuery,
  CreateShippingRateInput,
  UpdateShippingRateInput,
} from "./shipping.admin.schema.js";

export async function listAdminShippingRatesHandler(req: Request, res: Response): Promise<void> {
  const { page, limit, sort, ...filters } = req.validatedQuery as AdminShippingRateListQuery;
  const { data, meta } = await shippingAdminService.listAdminShippingRates(
    { page, limit, sort },
    filters,
  );
  res.json({ ok: true, data, meta });
}

export async function getAdminShippingRateHandler(req: Request, res: Response): Promise<void> {
  const data = await shippingAdminService.getAdminShippingRateById(req.params.id as string);
  res.json({ ok: true, data });
}

export async function createShippingRateHandler(req: Request, res: Response): Promise<void> {
  const data = await shippingAdminService.createShippingRate(req.body as CreateShippingRateInput);
  res.status(201).json({ ok: true, data });
}

export async function updateShippingRateHandler(req: Request, res: Response): Promise<void> {
  const data = await shippingAdminService.updateShippingRate(
    req.params.id as string,
    req.body as UpdateShippingRateInput,
  );
  res.json({ ok: true, data });
}

export async function deleteShippingRateHandler(req: Request, res: Response): Promise<void> {
  await shippingAdminService.deleteShippingRate(req.params.id as string);
  res.json({ ok: true, data: null });
}

export async function restoreShippingRateHandler(req: Request, res: Response): Promise<void> {
  const data = await shippingAdminService.restoreShippingRate(req.params.id as string);
  res.json({ ok: true, data });
}
