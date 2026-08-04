import type { NextFunction, Request, Response } from "express";
import * as categoriesService from "./categories.service.js";
import type { ListCategoriesQuery } from "./categories.schema.js";

// Shopper reads only — admin handlers live in categories.admin.controller.ts
// as of P8.S4.

export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { parentId, ...pagination } = req.validatedQuery as ListCategoriesQuery;
    const { data, meta } = await categoriesService.listCategories(parentId, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoriesService.getCategoryBySlug(req.params.slug as string);
    res.json({ ok: true, data: category });
  } catch (err) {
    next(err);
  }
}
