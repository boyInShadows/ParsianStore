import type { Request, Response } from "express";
import * as inventoryService from "./inventory.service.js";
import type { AdjustStockInput } from "./inventory.schema.js";
import type { PaginationQuery } from "../../utils/pagination.js";

export async function adjustStockHandler(req: Request, res: Response): Promise<void> {
  const { productId, delta, reason, refId } = req.body as AdjustStockInput;
  const product = await inventoryService.adjustStock(productId, delta, reason, {
    refId,
    byUserId: req.user!.sub,
  });
  res.json({ ok: true, data: product });
}

export async function listLowStockHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PaginationQuery;
  const { data, meta } = await inventoryService.listLowStockProducts(query);
  res.json({ ok: true, data, meta });
}
