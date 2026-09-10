import type { NextFunction, Request, Response } from "express";
import * as searchService from "./search.service.js";
import type { FacetsQuery, SearchProductsQuery } from "./search.schema.js";

export async function searchProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { q, vehicle, ...pagination } = req.validatedQuery as SearchProductsQuery;
    const { data, meta } = await searchService.searchProducts(
      q,
      vehicle,
      pagination,
      req.user?.accountType,
    );
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getFacetsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = req.validatedQuery as FacetsQuery;
    const facets = await searchService.getFacets(filters);
    res.json({ ok: true, data: facets });
  } catch (err) {
    next(err);
  }
}
