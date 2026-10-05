import type { Request, Response } from "express";
import * as brandsService from "./brands.service.js";
import type { PaginationQuery } from "../../utils/pagination.js";

// Shopper reads only — admin handlers live in brands.admin.controller.ts
// as of P8.S4.

export async function listBrandsHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PaginationQuery;
  const { data, meta } = await brandsService.listBrands(query);
  res.json({ ok: true, data, meta });
}

export async function getBrandBySlugHandler(req: Request, res: Response): Promise<void> {
  const brand = await brandsService.getBrandBySlug(req.params.slug as string);
  res.json({ ok: true, data: brand });
}
